/* global Plainview */
/*
 * JSON search controls. The walk itself lives in search-runner.js.
 */
((root) => {
  const { el, button, inputClear, selectHit, SearchDebounceMs } = Plainview.jsonToolsShared;

  function createSearchElements() {
    const searchWrap = el('div', 'pv-json-search');
    const search = el('input', 'pv-json-input');
    search.type = 'search';
    search.placeholder = 'Search keys and values…';
    search.setAttribute('aria-label', 'Search JSON keys and values');
    search.spellcheck = false;
    const prev = button('pv-meta-button pv-json-step', '↑');
    prev.title = 'Previous match';
    prev.setAttribute('aria-label', 'Previous match');
    const next = button('pv-meta-button pv-json-step', '↓');
    next.title = 'Next match';
    next.setAttribute('aria-label', 'Next match');
    const count = el('span', 'pv-json-count', '');
    searchWrap.append(search, prev, next, count);
    return { searchWrap, search, prev, next, count };
  }

  function bindSearchEvents({ search, prev, next, stepSearch, scheduleSearch }) {
    search.addEventListener('input', scheduleSearch);
    search.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      stepSearch(event.shiftKey ? -1 : 1);
    });
    prev.addEventListener('click', () => stepSearch(-1));
    next.addEventListener('click', () => stepSearch(1));
  }

  function createJsonSearch({ rootValue, indexRef, revealPath, status, searchResults, onClear }) {
    const { searchWrap, search, prev, next, count } = createSearchElements();
    let searchHits = [];
    let searchIndex = -1;
    let searchToken = 0;
    let timer = 0;

    function clearSearch() {
      for (const hit of searchHits) {
        Plainview.jsonToolsShared.unmark(hit.entry, 'pv-json-hit');
        Plainview.jsonToolsShared.unmark(hit.entry, 'pv-json-hit-active');
      }
      searchHits = [];
      searchIndex = -1;
      count.textContent = '';
      prev.disabled = true;
      next.disabled = true;
      searchResults.hidden = true;
      searchResults.replaceChildren();
      onClear();
    }

    function searchFailed(error) {
      status.textContent = `Search failed: ${error instanceof Error ? error.message : error}`;
      status.classList.add('is-error');
    }

    async function startSearch() {
      searchToken += 1;
      const token = searchToken;
      clearSearch();
      const query = search.value.trim();
      if (!query) {
        return;
      }

      const result = await Plainview.jsonSearchRunner.runSearch({
        count,
        indexRef,
        isActive: () => token === searchToken,
        needle: query.toLocaleLowerCase(),
        next,
        prev,
        query,
        revealPath,
        rootValue,
        searchResults,
        status,
      });
      if (!result || token !== searchToken) {
        return;
      }
      searchHits = result.hits;
      if (searchHits.length > 0) {
        searchIndex = selectHit(searchHits, 0, 'pv-json-hit-active');
      }
    }

    function stepSearch(delta) {
      if (searchHits.length === 0) {
        return;
      }
      searchIndex = selectHit(searchHits, searchIndex + delta, 'pv-json-hit-active');
    }

    function scheduleSearch() {
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(() => {
        startSearch().catch(searchFailed);
      }, SearchDebounceMs);
    }

    const searchClear = inputClear(search, 'Clear search', () => {
      globalThis.clearTimeout(timer);
      startSearch().catch(searchFailed);
    });
    searchWrap.insertBefore(searchClear, prev);
    bindSearchEvents({ search, prev, next, stepSearch, scheduleSearch });
    return searchWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonSearch });
})(globalThis);
