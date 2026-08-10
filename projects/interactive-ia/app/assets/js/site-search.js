/* ============================================
   SITE SEARCH
   Filters the inline SEARCH_INDEX (see
   search-index.js) — no fetch, no network call,
   so this works identically whether the site is
   hosted or opened as local files.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.js-site-search-input');
  const resultsEl = document.querySelector('.js-site-search-results');
  const countEl = document.querySelector('.js-site-search-count');
  if (!input || !resultsEl || typeof SEARCH_INDEX === 'undefined') return;

  const MAX_RESULTS = 20;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
      resultsEl.innerHTML = '';
      resultsEl.classList.remove('is-visible');
      if (countEl) countEl.textContent = '';
      return;
    }

    const matches = SEARCH_INDEX.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q) ||
      e.chapter.toLowerCase().includes(q)
    );

    resultsEl.classList.add('is-visible');

    if (countEl) {
      countEl.textContent = matches.length === 0
        ? `No results for "${query}"`
        : `${matches.length} result${matches.length === 1 ? '' : 's'} for "${query}"${matches.length > MAX_RESULTS ? ` (showing top ${MAX_RESULTS})` : ''}`;
    }

    if (matches.length === 0) {
      resultsEl.innerHTML = '';
      return;
    }

    resultsEl.innerHTML = matches.slice(0, MAX_RESULTS).map((e) => `
      <li class="site-search__item">
        <a href="${e.href}" class="site-search__item-link">
          <span class="site-search__item-type site-search__item-type--${e.type.toLowerCase()}">${e.type}</span>
          <span class="site-search__item-chapter">${escapeHtml(e.chapter)}</span>
          <span class="site-search__item-title">${escapeHtml(e.title)}</span>
          <span class="site-search__item-snippet">${escapeHtml(e.snippet)}</span>
        </a>
      </li>
    `).join('');
  }

  input.addEventListener('input', () => render(input.value));
});
