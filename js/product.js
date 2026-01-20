// js/product.js

async function loadProductData() {
  // Đường dẫn JSON: data/product-data.json (cùng level với product.html)
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

  // Related cards
  const related = qs('#pd-related');
  if (related) {
    related.innerHTML = '';
    (product.related || []).forEach(r => {
      const a = document.createElement('a');
      a.className = 'pd-related-card';
      a.href = `product.html?id=${encodeURIComponent(r.id)}`;
      a.innerHTML = `
        <div class="pd-related-img"><img src="${r.img}" alt="${r.title}" /></div>
        <div class="pd-related-body">
          <div class="pd-related-title">${r.title}</div>
          <div class="pd-related-link">Xem chi tiết</div>
        </div>
      `;
      related.appendChild(a);
    });
  }

  // Sample button
  const sampleBtn = qs('#pd-sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      // TODO: custom alert form please!
      alert('OK! Bạn để lại số điện thoại/Zalo ở form bên phải để bên mình gửi mẫu nhanh nhé.');
    });
  }

  // Form submit (demo) pd-submit
  const form = qs('#pd-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      alert('Đã gửi yêu cầu! Bên mình sẽ liên hệ sớm.');
      form.reset();
      qs('#pd-form-product').value = product.title;
    });
  }
})();
