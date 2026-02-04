import { PdFormService } from './pdFormService.js';

const service = new PdFormService({
  formSelector: '#pd-form',
  endpointUrl:
    // 'https://script.google.com/macros/s/AKfycbwkOm9ZjnsQzXofXENaSRtG4zfp1aF0OtgoiRbDIiKLs8W0rSB3EoFCTJXhV2WpHVSf/exec', test no send email
    'https://script.google.com/macros/s/AKfycbz6OxMb48_YsnDxsuSAw_RsJgPvwlnBfMtStk54nUU9HcyGhx_YPW1BLI9ZPznsPbb3/exec',
  deploymentId: 'AKfycbw3_exQfnwQlCOreof9fq7Kp_SCSCDivZI5Pag7o8yRxAexzsbV_kEP4fR4lneh_I2g',
  getProductName: () => product?.title || '',
});

service.init();

async function loadProductData() {
  const res = await fetch('data/product-data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Cannot load product-data.json (${res.status})`);
  return res.json();
}

(async function () {
  const PRODUCTS = await loadProductData();

  function qs(sel) {
    return document.querySelector(sel);
  }
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }
  function setText(id, val) {
    const el = qs(id);
    if (el) el.textContent = val ?? '';
  }

  const id = (getParam('id') || 'pnf-6535').toLowerCase();
  const product = PRODUCTS[id] || PRODUCTS['pnf-6535'];

  // Breadcrumb + Title
  setText('#pd-bc-cat', product.categoryLabel);
  setText('#pd-bc-code', product.code);
  setText('#pd-use', product.use);
  setText('#pd-title', product.title);
  qs('#pd-form-product').value = product.title;

  // Badges
  const stockBadge = qs('#pd-badge-stock');
  const processingBadge = qs('#pd-badge-processing');
  if (stockBadge) stockBadge.style.display = product.stock ? '' : 'none';
  if (processingBadge) processingBadge.style.display = product.processing ? '' : 'none';

  // Origin + meta
  setText('#pd-origin', product.origin);
  setText('#pd-origin2', product.origin);
  setText('#pd-moq', product.moq);
  setText('#pd-lead', product.lead);

  // Gallery
  const mainImg = qs('#pd-main-img');
  const thumbs = qs('#pd-thumbs');
  const imgList = product.images || [];
  if (mainImg && imgList.length) mainImg.src = imgList[0];

  function renderThumbs() {
    if (!thumbs) return;
    thumbs.innerHTML = '';
    imgList.forEach((src, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pd-thumb' + (idx === 0 ? ' active' : '');
      b.innerHTML = `<img src="${src}" alt="thumb ${idx + 1}" />`;
      b.addEventListener('click', () => {
        if (mainImg) mainImg.src = src;
        thumbs.querySelectorAll('.pd-thumb').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
      thumbs.appendChild(b);
    });
  }
  renderThumbs();

  // colors
  const colors = qs('#pd-colors');
  if (colors) {
    colors.innerHTML = '';
    (product.colors || []).forEach((s, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pd-swatch' + (idx === 0 ? ' active' : '');
      btn.title = s.name;
      btn.style.background = s.hex;

      btn.addEventListener('click', () => {
        colors.querySelectorAll('.pd-swatch').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
      });

      colors.appendChild(btn);
    });
  }

  // Select options
  const widthSel = qs('#pd-width');
  const gsmSel = qs('#pd-gsm');

  function fillSelect(sel, items) {
    if (!sel) return;
    sel.innerHTML = '';
    (items || []).forEach((it, idx) => {
      const opt = document.createElement('option');
      opt.value = it;
      opt.textContent = it;
      if (idx === 0) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  fillSelect(widthSel, product.widths);
  fillSelect(gsmSel, product.gsms);

  // Checks
  const checks = qs('#pd-checks');
  if (checks) {
    checks.innerHTML = '';
    (product.checks || []).forEach(t => {
      const div = document.createElement('div');
      div.className = 'pd-check';
      div.innerHTML = `<i class="fas fa-check-circle"></i><span>${t}</span>`;
      checks.appendChild(div);
    });
  }

  // Specs
  const specDl = qs('#pd-spec');
  if (specDl) {
    specDl.innerHTML = '';
    Object.entries(product.specs || {}).forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k + ':';
      const dd = document.createElement('dd');
      dd.textContent = v;
      specDl.appendChild(dt);
      specDl.appendChild(dd);
    });
  }

  // Tabs
  document.querySelectorAll('.pd-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pd-tab').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      qs('#pd-panel-spec').classList.toggle('active', tab === 'spec');
      qs('#pd-panel-cert').classList.toggle('active', tab === 'cert');
    });
  });

  // Related cards (render like Home product card)
  const related = qs('#pd-related');
  if (related) {
    related.innerHTML = '';

    (product.related || []).forEach(r => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.dataset.productId = (r.id || '').toLowerCase();

      card.innerHTML = `
      <div class="product-img">
        <img src="${r.img}" alt="${r.title}" />
      </div>
      <div class="product-body">
        <h4>${r.title}</h4>
        <a class="btn btn-primary pd-submit" href="product.html?id=${encodeURIComponent(r.id)}">Xem chi tiết</a>
      </div>
    `;

      related.appendChild(card);
    });
  }

  // Click Price button - scroll to form smoothly
  const priceBtn = qs('#pd-price-btn');
  const formEl = qs('#form-id');

  if (priceBtn && formEl) {
    priceBtn.addEventListener('click', e => {
      e.preventDefault(); // ❌ không reload page

      // Optional: show small hint
      Swal.fire({
        title: 'Nhận báo giá',
        text: 'Vui lòng điền thông tin ở form để nhận báo giá nhanh nhất nhé!',
        icon: 'info',
        iconColor: '#d9c210',
        confirmButtonColor: '#d9c210',
        showConfirmButton: true,
        focusConfirm: true,
        showCloseButton: true,
        returnFocus: false,
      });

      // Scroll after Swal appears (smooth UX)
      setTimeout(() => {
        const navbar = document.querySelector('.navbar');
        const offset = navbar ? navbar.offsetHeight + 12 : 80;

        const y = formEl.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: y,
          behavior: 'smooth',
        });

        // Optional: focus first input
        const firstInput = formEl.querySelector('input, textarea');
        if (firstInput) firstInput.focus({ preventScroll: true });
      }, 300);
    });
  }
})();
