/* ═══════════════════════════════════════════════════════════════════════════
   pCloud — Search Module
   Debounced search with text highlighting
   ═══════════════════════════════════════════════════════════════════════════ */

const Search = (() => {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  let isSearchActive = false;

  /**
   * Initialize search listeners
   */
  function init(onSearch, onClear) {
    // Debounced search input
    const debouncedSearch = Utils.debounce((query) => {
      if (query.length > 0) {
        searchClear.style.display = 'flex';
        isSearchActive = true;
        onSearch(query);
      } else {
        searchClear.style.display = 'none';
        if (isSearchActive) {
          isSearchActive = false;
          onClear();
        }
      }
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value.trim());
    });

    // Enter key
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          isSearchActive = true;
          searchClear.style.display = 'flex';
          onSearch(query);
        }
      }
      if (e.key === 'Escape') {
        clearSearch();
        onClear();
      }
    });

    // Clear button
    searchClear.addEventListener('click', () => {
      clearSearch();
      onClear();
    });
  }

  /**
   * Clear the search input
   */
  function clearSearch() {
    searchInput.value = '';
    searchClear.style.display = 'none';
    isSearchActive = false;
    searchInput.blur();
  }

  /**
   * Highlight matching text in a name
   * @param {string} name - original name
   * @param {string} query - search query
   * @returns {string} HTML with highlighted text
   */
  function highlightMatch(name, query) {
    if (!query) return UI.escapeHtml(name);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return UI.escapeHtml(name).replace(regex, '<mark style="background: var(--warning-bg); color: var(--text-primary); padding: 0 2px; border-radius: 2px;">$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getIsActive() {
    return isSearchActive;
  }

  return {
    init,
    clearSearch,
    highlightMatch,
    getIsActive,
  };
})();
