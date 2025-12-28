/*===== Resize Navbar on Scroll =====*/
var navbar = document.querySelector('.navbar');
// when the scroll is higher than 20 viewport height, add the sticky classs to the tag with a class navbar
window.onscroll = () => {
  this.scrollY > 20 ? navbar.classList.add('sticky') : navbar.classList.remove('sticky');
};
/*===== Nav Toggler =====*/
const navMenu = document.querySelector('.menu');
var mobileBtn = document.querySelector('.menu-btn');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    mobileBtn.classList.toggle('active');
  });
}
// closing menu when link is clicked
const navLink = document.querySelectorAll('.nav-link');
function linkAction() {
  const navMenu = document.querySelector('.menu');
  navMenu.classList.remove('active');
  mobileBtn.classList.remove('active');
}
navLink.forEach(n => n.addEventListener('click', linkAction));
/*===== Scroll Section Active Link =====*/

const Section = document.querySelectorAll('section[id]');
function scrollActive() {
  const scrollY = window.pageYOffset;
  Section.forEach(current => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 50;
    sectionId = current.getAttribute('id');
    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document.querySelector('.links a[href*=' + sectionId + ']').classList.add('active');
    } else {
      document.querySelector('.links a[href*=' + sectionId + ']').classList.remove('active');
    }
  });
}
window.addEventListener('scroll', scrollActive);
/*===== Skills Animation =====*/
const skills_wrap = document.querySelector('.about-skills'),
  skills_bar = document.querySelectorAll('.progress-line');
window.addEventListener('scroll', () => {
  skillsEffect();
});
// every time we scroll checking, we exceeded the about-skills or not
function checkScroll(el) {
  //getting the top position of about-skills relative to view port, in other words we need to get
  // amount of pixels between about-skills and the top edge of the window.
  let rect = el.getBoundingClientRect();
  // after knowing the amount of pixels between the top edge of about skills and the top edge of window
  // now we will check we exceeded the bottom edge of about skills or not
  if (window.innerHeight >= rect.top + el.offsetHeight) return true;
  return false;
}
function skillsEffect() {
  if (!checkScroll(skills_wrap)) return;
  skills_bar.forEach(skill => (skill.style.width = skill.dataset.progress));
}
/*===== Portfolio Item Filter =====*/
const FilterContainer = document.querySelector('.filter-tabs'),
  filterBtns = FilterContainer.children;
totalFilterBtn = filterBtns.length;
((PortfolioItems = document.querySelectorAll('.portfolio-item')),
  (totalportfolioItem = PortfolioItems.length));
for (let i = 0; i < totalFilterBtn; i++) {
  filterBtns[i].addEventListener('click', function () {
    FilterContainer.querySelector('.active').classList.remove('active');
    this.classList.add('active');
    const filterValue = this.getAttribute('data-filter');
    for (let k = 0; k < totalportfolioItem; k++) {
      if (filterValue === PortfolioItems[k].getAttribute('data-category')) {
        PortfolioItems[k].classList.remove('hide');
        PortfolioItems[k].classList.add('show');
      } else {
        PortfolioItems[k].classList.remove('show');
        PortfolioItems[k].classList.add('hide');
      }
      if (filterValue === 'all') {
        PortfolioItems[k].classList.remove('hide');
        PortfolioItems[k].classList.add('show');
      }
    }
  });
}
/*===== Lightbox =====*/
const lightbox = document.querySelector('.lightbox'),
  lightboxImg = lightbox.querySelector('.lightbox-img'),
  lightboxClose = lightbox.querySelector('.lightbox-close'),
  lightboxText = lightbox.querySelector('.caption-text'),
  lightboxCounter = lightbox.querySelector('.caption-counter');
let itemIndex = 0;
for (let i = 0; i < totalportfolioItem; i++) {
  PortfolioItems[i].addEventListener('click', function () {
    itemIndex = i;
    changeItem();
    toggleLightbox();
  });
}
function nextItem() {
  if (itemIndex == totalportfolioItem - 1) {
    itemIndex = 0;
  } else {
    itemIndex++;
  }
  changeItem();
}
function prevItem() {
  if (itemIndex == 0) {
    itemIndex = totalportfolioItem - 1;
  } else {
    itemIndex--;
  }
  changeItem();
}
function toggleLightbox() {
  lightbox.classList.toggle('open');
}
function changeItem() {
  imgSrc = PortfolioItems[itemIndex].querySelector('.portfolio-img img').getAttribute('src');
  lightboxImg.src = imgSrc;
  lightboxText.innerHTML = PortfolioItems[itemIndex].querySelector('h4').innerHTML;
  lightboxCounter.innerHTML = itemIndex + 1 + ' of ' + totalportfolioItem;
}
// close lightbox
lightbox.addEventListener('click', function (event) {
  if (event.target === lightboxClose || event.target === lightbox) {
    toggleLightbox();
  }
});

/* =========================================================
   Featured Products: Filter + Load More (TOTAL/5) + Smooth Animation
   - filter tabs: .filter-tabs button[data-filter]
   - items: .featured-products .product-card[data-category]
   - load more button: #load-more-btn
========================================================= */
function initFeaturedProducts() {
  const productsContainer = document.querySelector('.featured-products');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const filterTabs = document.querySelector('.filter-tabs');

  if (!productsContainer || !loadMoreBtn) return;

  const allItems = Array.from(productsContainer.querySelectorAll('.product-card'));
  if (allItems.length === 0) return;

  // total/5 mỗi lần click (vd: 50/5 = 10)
  const STEP = Math.max(1, Math.ceil(allItems.length / 5));

  let currentFilter = 'all';
  let filteredItems = allItems;
  let visible = 0;

  function setActiveTab(filterValue) {
    if (!filterTabs) return;
    const btns = Array.from(filterTabs.querySelectorAll('button[data-filter]'));
    btns.forEach(b => b.classList.remove('active'));
    const activeBtn = btns.find(b => (b.dataset.filter || '') === filterValue);
    if (activeBtn) activeBtn.classList.add('active');
  }

  function computeFiltered(filterValue) {
    if (filterValue === 'all') return allItems;
    return allItems.filter(it => (it.dataset.category || '') === filterValue);
  }

  function hideAll() {
    allItems.forEach(it => {
      it.classList.add('hidden');
      it.classList.remove('pre-reveal', 'reveal');
    });
  }

  function renderInitial() {
    hideAll();

    filteredItems.forEach((it, idx) => {
      if (idx < visible) it.classList.remove('hidden');
    });

    loadMoreBtn.style.display = visible >= filteredItems.length ? 'none' : '';
  }

  function applyFilter(filterValue) {
    currentFilter = filterValue || 'all';
    filteredItems = computeFiltered(currentFilter);

    visible = Math.min(STEP, filteredItems.length);
    renderInitial();

    // scroll nhẹ về list cho cảm giác "đã đổi category"
    productsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Smooth reveal with stagger (mượt hơn kiểu animationend cũ)
  function revealRange(fromIndex, toIndex) {
    const count = toIndex - fromIndex;
    if (count <= 0) return;

    // tránh spam click
    loadMoreBtn.disabled = true;

    for (let i = fromIndex; i < toIndex; i++) {
      const it = filteredItems[i];
      if (!it) continue;

      // cho item vào layout trước
      it.classList.remove('hidden');

      // set trạng thái ban đầu (opacity 0, translateY)
      it.classList.add('pre-reveal');

      // force reflow để browser "nhận" state pre-reveal
      void it.offsetHeight;

      // stagger từng item 70ms
      const delay = (i - fromIndex) * 70;
      setTimeout(() => {
        it.classList.add('reveal');
        it.classList.remove('pre-reveal');
      }, delay);
    }

    // re-enable sau khi animation xong
    const totalDelay = (count - 1) * 70 + 380;
    setTimeout(() => {
      loadMoreBtn.disabled = false;
    }, totalDelay);
  }

  // Click "Xem thêm sản phẩm"
  loadMoreBtn.addEventListener('click', function (e) {
    e.preventDefault();

    const prevVisible = visible; // <-- DÒNG BẠN HỎI NẰM Ở ĐÂY
    visible = Math.min(visible + STEP, filteredItems.length);

    // reveal mượt cho phần mới
    revealRange(prevVisible, visible);

    // update button
    loadMoreBtn.style.display = visible >= filteredItems.length ? 'none' : '';

    // scroll đến item mới đầu tiên
    const firstNew = filteredItems[Math.max(0, prevVisible)];
    if (firstNew) firstNew.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Click tab category
  if (filterTabs) {
    filterTabs.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;

      e.preventDefault();
      const filterValue = btn.dataset.filter || 'all';

      setActiveTab(filterValue);
      applyFilter(filterValue);
    });
  }

  // init: dùng tab đang active nếu có, không thì all
  const activeBtn = filterTabs ? filterTabs.querySelector('button[data-filter].active') : null;
  const initialFilter = activeBtn ? activeBtn.dataset.filter : 'all';

  setActiveTab(initialFilter || 'all');
  applyFilter(initialFilter || 'all');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeaturedProducts);
} else {
  initFeaturedProducts();
}

(function initProductDetailNavigation() {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-detail');
    if (!btn) return;

    e.preventDefault();

    const card = btn.closest('.product-card');
    if (!card) return;

    // Ưu tiên id explicit
    let id = (card.dataset.productId || '').trim();

    // Fallback: lấy từ title (slug)
    if (!id) {
      const title = (card.querySelector('h4')?.textContent || 'san-pham').trim().toLowerCase();
      id = title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    window.location.href = `product.html?id=${encodeURIComponent(id)}`;
  });
})();
