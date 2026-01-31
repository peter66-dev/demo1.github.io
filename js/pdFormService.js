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

      try {
        const clientKey = this.getOrCreateClientKey();
        this._setLoading(true);

        const { subject, html } = buildEmailPayload({
          fullName: data.fullName,
          phone: data.phone,
          quantity: data.quantity,
          productName: data.productName,
          note: data.note,
        });

        const payload = {
          id: this.uuidv4(),
          client_key: clientKey,
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
        console.log('PETER Email send data:', result);
        this._setLoading(false);

        if (result.status_code === 200 && result.message === 'SUCCESS') {
          Swal.fire({
            icon: 'success',
            title: 'Đã gửi yêu cầu!',
            html: `<div style="line-height:1.6">Bên mình sẽ liên hệ sớm qua <b>Zalo/Điện thoại</b> bạn đã để lại nhé.</div>`,
            confirmButtonColor: '#d9c210',
          });
        } else {
          this._alertError('Gửi yêu cầu chưa thành công. Hãy thử lại lần sau nhé!');
        }
      } catch (ex) {
        console.error(ex);
        this._setLoading(false);
        this._alertError('Gửi yêu cầu chưa thành công. Hãy thử lại lần sau nhé!');
      }
    });
  }

  async _sendEmail(payload) {
    if (!this.endpointUrl) throw new Error('Missing endpointUrl');

    const response = await fetch(this.endpointUrl, {
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

  getOrCreateClientKey() {
    const KEY = 'pnf_client_key';
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = this.uuidv4();
      localStorage.setItem(KEY, v);
    }
    return v;
  }

  getBrowserType() {
    return navigator.userAgent || '';
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
