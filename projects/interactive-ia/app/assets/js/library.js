/* ============================================
   LIBRARY FILTER + SEARCH
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const items = Array.from(document.querySelectorAll('.js-library-item'));
  const filters = Array.from(document.querySelectorAll('.js-library-filter'));
  const searchInput = document.querySelector('.js-library-search');
  const countEl = document.querySelector('.js-library-count');
  const emptyEl = document.querySelector('.js-library-empty');

  let activeCategory = 'all';

  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    let visible = 0;

    items.forEach((item) => {
      const category = item.dataset.category;
      const haystack = item.dataset.search;
      const matchesCategory = activeCategory === 'all' || category === activeCategory;
      const matchesQuery = !query || haystack.includes(query);
      const show = matchesCategory && matchesQuery;
      item.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });

    if (countEl) {
      countEl.textContent = `${visible} prompt${visible === 1 ? '' : 's'}`;
    }
    if (emptyEl) {
      emptyEl.classList.toggle('is-visible', visible === 0);
    }
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = btn.dataset.category;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  applyFilters();
});
