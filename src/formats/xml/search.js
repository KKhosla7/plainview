/* global Plainview */
/*
 * XML element, attribute and text search.
 */
((root) => {
  const { el, button, exportNode, searchText, mark, unmark, selectHit, SearchDebounceMs } =
    Plainview.xmlToolsShared;

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

  function createSearchElements() {
    const searchWrap = el('div', 'pv-json-search');
    const searchRow = el('div', 'pv-json-search-row');
    const countRow = el('div', 'pv-json-count-row');
    const search = el('input', 'pv-json-input');
    search.type = 'search';
    search.placeholder = 'Search elements, attributes and text…';
    search.setAttribute('aria-label', 'Search XML elements and text');
    search.spellcheck = false;
    const prev = button('pv-meta-button pv-json-step', '↑');
    prev.title = 'Previous match';
    prev.setAttribute('aria-label', 'Previous match');
    const next = button('pv-meta-button pv-json-step', '↓');
    next.title = 'Next match';
    next.setAttribute('aria-label', 'Next match');
    const count = el('span', 'pv-json-count', '');
    searchRow.append(search, prev, next);
    countRow.append(count);
    searchWrap.append(searchRow, countRow);
    return { count, next, prev, search, searchWrap };
  }

  function createXmlSearch({ byNode, exportState, status }) {
    const { count, next, prev, search, searchWrap } = createSearchElements();
    let searchHits = [];
    let searchIndex = -1;
    let searchTimer = 0;

    function clearSearch() {
      for (const hit of searchHits) {
        unmark(hit, 'pv-xml-hit');
        unmark(hit, 'pv-xml-hit-active');
      }
      searchHits = [];
      searchIndex = -1;
      exportState?.clear('search');
      count.textContent = '';
      prev.disabled = true;
      next.disabled = true;
    }

    function clearStatus() {
      status.textContent = '';
      status.className = 'pv-json-status';
    }

    function runSearch() {
      clearSearch();
      clearStatus();
      const value = search.value.trim();
      if (!value) {
        return;
      }
      const needle = value.toLocaleLowerCase();
      for (const [node, entry] of byNode) {
        if (!searchText(node).toLocaleLowerCase().includes(needle)) {
          continue;
        }
        searchHits.push(entry);
        mark(entry, 'pv-xml-hit');
      }
      count.textContent = `${searchHits.length} ${searchHits.length === 1 ? 'match' : 'matches'}`;
      prev.disabled = searchHits.length === 0;
      next.disabled = searchHits.length === 0;
      if (searchHits.length > 0) {
        exportState?.set(
          'search',
          searchHits.flatMap((entry) => {
            const node = exportNode(entry.source);
            return node ? [node] : [];
          }),
        );
        searchIndex = selectHit(searchHits, 0, 'pv-xml-hit-active');
      } else {
        status.textContent = `No elements or text matched ${value}.`;
        status.classList.add('is-empty');
      }
    }

    function stepSearch(delta) {
      if (searchHits.length === 0) {
        return;
      }
      searchIndex = selectHit(searchHits, searchIndex + delta, 'pv-xml-hit-active');
    }

    function scheduleSearch() {
      globalThis.clearTimeout(searchTimer);
      searchTimer = globalThis.setTimeout(runSearch, SearchDebounceMs);
    }

    bindSearchEvents({ search, prev, next, stepSearch, scheduleSearch });
    return searchWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createXmlSearch });
})(globalThis);
