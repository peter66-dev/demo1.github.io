import { buildEmailPayload } from './pdEmailTemplates.js';

function isValidEmailStrict(email) {
  if (typeof email !== 'string') return false;
  const v = email.trim();
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!re.test(v)) return false;
  if (v.includes('..')) return false;

  const [local, domain] = v.split('@');
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('-.') || domain.includes('.-')) return false;

  return true;
}

// Frontend rate-limit config (localStorage)
const RL = {
  MAX_PER_DAY: 3,
  MAX_RECORDS: 500,
  STORAGE_PREFIX: 'rl_email_',
  GET_RECORDS_URL: '?action=getRecords',
};

export class PdFormService {
  constructor({ formSelector, endpointUrl, getProductName }) {
    this.form = document.querySelector(formSelector);
    this.endpointUrl = endpointUrl;
    this.getProductName = getProductName || (() => '');
  }

  init() {
    if (!this.form) return;

    this.form.addEventListener('submit', async e => {
      e.preventDefault();

      const data = this._readForm();
      const warning = this._validate(data);

      if (warning) {
        this._alertWarning(warning);
        return;
      }
      const publicIp = await this.getOrCreatePublicIp();
      const requestId = this.uuidv4();

      try {
        console.log('PETER -- publicIp: ', publicIp);
        this._setLoading(true);

        // 0) Nếu local cache chưa có/empty => sync từ server (getRecords)
        await this.ensureRlStateFromServer_(publicIp);

        // 1) Reserve BEFORE send email
        const reserve = this.rlReserve_(publicIp, requestId);
        if (!reserve.allowed) {
          this._setLoading(false);
          this._alertError(
            `Bạn đã gửi quá ${RL.MAX_PER_DAY} lần cho hôm nay.<br/>Vui lòng thử lại vào ngày hôm sau.</b>`
          );
          return;
        }

        const { subject, html } = buildEmailPayload({
          fullName: data.fullName,
          phone: data.phone,
          quantity: data.quantity,
          productName: data.productName,
          note: data.note,
        });

        const payload = {
          id: requestId,
          public_ip: publicIp,
          browser_type: navigator.userAgent || '',
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          product_name: data.productName,
          quantity: data.quantity,
          note: data.note,
          subject,
          html,
        };

        const [response] = await Promise.all([
          this._sendEmail(payload),
          new Promise(r => setTimeout(r, 3000)),
        ]);
        const result = await response.json();
        this._setLoading(false);

        if (result.status_code === 200 && result.message === 'SUCCESS') {
          this._successAlert();
        } else {
          this.rlRollback_(publicIp, requestId, 'SERVER_FAIL');
          this._alertError('Gửi yêu cầu chưa thành công. Hãy thử lại lần sau nhé!');
        }
      } catch (ex) {
        console.error(ex);
        this._setLoading(false);
        this.rlRollback_(publicIp, requestId, 'NETWORK_OR_EXCEPTION');
        this._alertError('Gửi yêu cầu chưa thành công. Hãy thử lại lần sau nhé!');
      }
    });
  }

  todayKey_() {
    const d = new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`; // yyyy-MM-dd
  }

  rlStorageKey_() {
    return 'rl_email_' + this.todayKey_();
  }

  loadRlState_() {
    const key = this.rlStorageKey_();
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Corrupted cache, reset');
      }
    }

    return {
      date: this.todayKey_(),
      counts: {},
      records: [],
    };
  }

  saveRlState_(state) {
    const key = this.rlStorageKey_();
    localStorage.setItem(key, JSON.stringify(state));
  }

  resetIfNewDay_(state) {
    const today = this.todayKey_();
    if (!state || state.date !== today) {
      return {
        date: today,
        counts: {},
        records: [],
      };
    }
    return state;
  }

  /**
   * Reserve 1 slot trước khi send email.
   * Return: { allowed: boolean, remaining: number }
   */
  rlReserve_(publicIp, id) {
    let state = this.resetIfNewDay_(this.loadRlState_());

    const cur = Number(state.counts[publicIp] || 0);
    if (cur >= RL.MAX_PER_DAY) {
      return { allowed: false, remaining: 0 };
    }

    state.counts[publicIp] = cur + 1;

    state.records.push({
      id: id || '',
      public_ip: publicIp,
      at: new Date().toISOString(),
      type: 'RESERVED',
    });
    if (state.records.length > RL.MAX_RECORDS) {
      state.records = state.records.slice(state.records.length - RL.MAX_RECORDS);
    }
    console.log('PETER -- cached records - ', state.records);
    this.saveRlState_(state);
    return { allowed: true, remaining: RL.MAX_PER_DAY - (cur + 1) };
  }

  rlRollback_(publicIp, id, reason) {
    let state = this.resetIfNewDay_(this.loadRlState_());
    const cur = Number(state.counts[publicIp] || 0);
    state.counts[publicIp] = Math.max(0, cur - 1);

    state.records.push({
      id: id || '',
      public_ip: publicIp,
      at: new Date().toISOString(),
      type: 'ROLLBACK',
      reason: reason || '',
    });
    if (state.records.length > RL.MAX_RECORDS) {
      state.records = state.records.slice(state.records.length - RL.MAX_RECORDS);
    }

    this.saveRlState_(state);
  }

  async _sendEmail(payload) {
    if (!this.endpointUrl) throw new Error('Missing endpointUrl');

    const response = await fetch(this.endpointUrl + '?action=sendEmail', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return response;
  }

  _readForm() {
    const fullName = this.form.querySelector('[name="fullName"]')?.value?.trim() || '';
    const phone = this.form.querySelector('[name="phone"]')?.value?.trim() || '';
    const email = this.form.querySelector('[name="email"]')?.value?.trim() || '';
    const quantity = this.form.querySelector('[name="quantity"]')?.value?.trim() || '';
    const productName = this.form.querySelector('[id="pd-form-product"]')?.value?.trim() || '';
    const note = this.form.querySelector('[name="note"]')?.value?.trim() || '';

    return { fullName, phone, email, quantity, productName, note };
  }

  _validate({ fullName, phone, email, quantity }) {
    if (!fullName) return 'Bạn vui lòng nhập <b>Họ tên</b>.';
    if (!phone) return 'Bạn vui lòng nhập <b>Điện thoại / Zalo</b>.';
    if (!email) return 'Bạn vui lòng nhập <b>Email</b>.';
    else if (!isValidEmailStrict(email)) {
      return 'Bạn vui lòng nhập đúng định dạng <b>Email</b>.';
    }
    if (!quantity) return 'Bạn vui lòng nhập <b>Số lượng</b>.';

    return '';
  }

  async canSend(key, ttlMs = 60000) {
    const now = Date.now();
    const last = Number(localStorage.getItem(key) || 0);
    if (now - last < ttlMs) return false;
    localStorage.setItem(key, String(now));
    return true;
  }

  uuidv4() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async getOrCreatePublicIp(cacheMs = 6 * 60 * 60 * 1000) {
    const CACHE_KEY = 'pnf_public_ip_cache';
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.ip && cached?.ts && Date.now() - cached.ts < cacheMs) {
        return cached.ip;
      }
    } catch (_) {
      console.log('PETER -- Invalid cached IP');
    }

    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot fetch IP');
    const data = await res.json();

    const ip = String(data?.ip || '').trim();
    if (ip) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ip, ts: Date.now() }));
    }
    return ip || null;
  }

  rlSyncKey_() {
    return `rl_sync_${this.todayKey_()}`; // 1 key/ngày
  }

  shouldSyncFromServer_() {
    const k = this.rlSyncKey_();
    const last = Number(localStorage.getItem(k) || 0);
    return !last || Date.now() - last > RL.LOCAL_SYNC_TTL_MS;
  }

  markSynced_() {
    localStorage.setItem(this.rlSyncKey_(), String(Date.now()));
  }

  async fetchRecordsToday_(publicIp) {
    if (!RL.GET_RECORDS_URL) throw new Error('Missing RL.GET_RECORDS_URL');

    const day = this.todayKey_();
    console.log('PETER -- fetching records from server for ', { publicIp, day });
    const url = `${this.endpointUrl}${RL.GET_RECORDS_URL}&public_ip=${encodeURIComponent(publicIp)}&day=${encodeURIComponent(day)}`;
    console.log('PETER -- fetchRecordsToday_ url=', url);
    // PETER -- fetchRecordsToday_ url= ?action=getRecords&public_ip=123.21.136.174&day=2026-02-01

    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('getRecords API failed');

    const json = await res.json().catch(() => ({}));
    console.log('PETER -- getRecords response: ', json);
    if (json?.status_code !== 200 || json?.message !== 'SUCCESS') {
      throw new Error(json?.error_message || 'getRecords returned FAILED');
    }

    return json?.data || null;
  }

  /**
   * Nếu local chưa có counts cho IP hôm nay => fetch server getRecords để sync count.
   * Chỉ gọi server khi local missing/empty hoặc TTL hết hạn.
   */
  async ensureRlStateFromServer_(publicIp) {
    let state = this.resetIfNewDay_(this.loadRlState_());

    const hasLocalCount = Number.isFinite(Number(state.counts?.[publicIp]));
    if (hasLocalCount && !this.shouldSyncFromServer_()) {
      console.log('PETER -- using local RL state, no need to sync from server');
      return state;
    }

    // local missing OR TTL expired => sync
    try {
      const data = await this.fetchRecordsToday_(publicIp);
      const serverTotal = Number(data?.total || 0);

      state.counts = state.counts || {};
      state.counts[publicIp] = serverTotal;

      this.saveRlState_(state);
      this.markSynced_();

      console.log('PETER -- synced from server. data=', { data });
      state = data;
      return state;
    } catch (e) {
      console.warn('PETER -- sync from server failed, fallback to local', e);
      return state; // fail thì vẫn dùng local
    }
  }

  getBrowserType() {
    return navigator.userAgent || '';
  }

  _successAlert() {
    Swal.fire({
      icon: 'success',
      title: 'Đã gửi yêu cầu!',
      html: `<div style="line-height:1.6">Bên mình sẽ liên hệ sớm qua <b>Zalo/Điện thoại</b> bạn đã để lại nhé.</div>`,
      confirmButtonColor: '#d9c210',
    });
  }

  _alertWarning(messageHtml) {
    Swal.fire({
      icon: 'warning',
      title: 'Cập nhật thông tin',
      html: `<div style="line-height:1.6">${messageHtml}</div>`,
      confirmButtonColor: '#d9c210',
    });
  }

  _alertError(messageHtml) {
    Swal.fire({
      icon: 'error',
      title: 'Lỗi hệ thống',
      html: `<div style="line-height:1.6">${messageHtml}</div>`,
      confirmButtonColor: '#d9c210',
    });
  }

  _setLoading(isLoading) {
    const btn = this.form.querySelector('button[type="submit"], input[type="submit"]');
    if (btn) {
      btn.disabled = !!isLoading;
      btn.style.opacity = isLoading ? '0.7' : '';
      btn.style.cursor = isLoading ? 'not-allowed' : '';
    }

    if (isLoading) {
      Swal.fire({
        title: 'Đang gửi yêu cầu...',
        html: '<div style="line-height:1.6">Vui lòng chờ trong giây lát ⏳</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
    } else {
      if (Swal.isVisible()) {
        Swal.close();
      }
    }
  }
}
