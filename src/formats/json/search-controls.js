/* global Plainview */
/*
 * JSON tree search controls.
 */
((root) => {
  const {
    el,
    button,
    inputClear,
    mark,
    unmark,
    selectHit,
    previewValue,
    primitiveText,
    renderResults,
    SearchDebounceMs,
  } = Plainview.jsonToolsShared;

  function searchable(entry) {
    const key = entry.isRoot ? '' : String(entry.key);
    const quotedKey = entry.isRoot ? '' : JSON.stringify(String(entry.key));
    const primitive = primitiveText(entry.value);
    const quotedValue =
      Plainview.valueKind(entry.value) === 'string' ? JSON.stringify(entry.value) : primitive;
    const preview = primitive || previewValue(entry.value);
    return [
      entry.pathText,
      key,
      quotedKey,
      primitive,
      quotedValue,
      preview,
      key ? `${key}: ${primitive}` : '',
      key ? `${key}:${primitive}` : '',
      quotedKey ? `${quotedKey}: ${quotedValue}` : '',
      quotedKey ? `${quotedKey}:${quotedValue}` : '',
      key ? `${key} ${primitive}` : '',
    ]
      .join(' ')
      .toLocaleLowerCase();
  }

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

  function ensureFullIndex(rootValue, indexState) {
    if (!indexState.fullIndex) {
      indexState.fullIndex = Plainview.jsonSearch.build(rootValue);
    }

    return indexState.fullIndex;
  }

  function collectSearchMatches({ needle, rootValue, indexRef, indexState }) {
    const matches = [];
    const hits = [];
    let external = 0;
    for (const entry of ensureFullIndex(rootValue, indexState)) {
      if (!searchable(entry).includes(needle)) {
        continue;
      }
      const node = indexRef.current.get(entry.pathText);
      matches.push({ ...entry, rendered: Boolean(node) });
      if (node) {
        hits.push({ entry: node });
        mark(node, 'pv-json-hit');
      } else {
        external += 1;
      }
    }

    return { matches, hits, external };
  }

  function createJsonSearch({ rootValue, indexRef, status, searchResults, onClear }) {
    const { searchWrap, search, prev, next, count } = createSearchElements();
    let searchHits = [];
    let searchIndex = -1;
    let timer = 0;
    const indexState = { fullIndex: null };

    function clearSearch() {
      for (const hit of searchHits) {
        unmark(hit.entry, 'pv-json-hit');
        unmark(hit.entry, 'pv-json-hit-active');
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

    function runSearch() {
      clearSearch();
      const query = search.value.trim();
      if (!query) {
        return;
      }
      const needle = query.toLocaleLowerCase();
      const { matches, hits, external } = collectSearchMatches({
        needle,
        rootValue,
        indexRef,
        indexState,
      });
      searchHits = hits;
      count.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
      prev.disabled = searchHits.length === 0;
      next.disabled = searchHits.length === 0;
      if (searchHits.length > 0) {
        searchIndex = selectHit(searchHits, 0, 'pv-json-hit-active');
      }
      renderResults({ list: searchResults, matches, indexRef });
      if (matches.length === 0) {
        status.textContent = `No matches for ${query}.`;
        status.classList.add('is-empty');
      } else if (external > 0) {
        status.textContent = `${external} match(es) outside the loaded tree are listed below.`;
        status.classList.add('is-empty');
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
      timer = globalThis.setTimeout(runSearch, SearchDebounceMs);
    }

    const searchClear = inputClear(search, 'Clear search', () => {
      globalThis.clearTimeout(timer);
      runSearch();
    });
    searchWrap.insertBefore(searchClear, prev);
    bindSearchEvents({ search, prev, next, stepSearch, scheduleSearch });
    return searchWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonSearch });
})(globalThis);
