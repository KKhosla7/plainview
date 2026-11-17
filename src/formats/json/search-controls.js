/* global Plainview */
/*
 * JSON search controls. The walk itself lives in search-runner.js.
 */
((root) => {
  const { el, button, bindResultDismiss, inputClear, selectHit, SearchDebounceMs } =
    Plainview.jsonToolsShared;

  function createSearchElements() {
    const searchWrap = el('div', 'pv-json-search');
    const searchRow = el('div', 'pv-json-search-row');
    const countRow = el('div', 'pv-json-count-row');
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
    searchRow.append(search, prev, next);
    countRow.append(count);
    searchWrap.append(searchRow, countRow);
    return { countRow, searchWrap, searchRow, search, prev, next, count };
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

  function valueAtPath(rootValue, path) {
    let value = rootValue;
    for (const segment of path) {
      if (value === null || Plainview.valueKind(value) !== 'object') {
        return;
      }
      value = value[segment];
    }

    return value;
  }

  function recordsForMatches(rootValue, matches) {
    const records = [];
    const seen = new Set();
    for (const { path, value } of matches) {
      const isRecord = value !== null && Plainview.valueKind(value) === 'object';
      const parentPath = path.slice(0, -1);
      const parent = valueAtPath(rootValue, parentPath);
      const parentIsRecord =
        parent !== null && Plainview.valueKind(parent) === 'object' && !Array.isArray(parent);
      let record = value;
      let recordPath = path;
      if (!isRecord && parentIsRecord) {
        record = parent;
        recordPath = parentPath;
      }
      const pathText = Plainview.jsonPath.pathToJsonPath(recordPath);
      if (seen.has(pathText)) {
        continue;
      }
      seen.add(pathText);
      records.push(record);
    }

    return records;
  }

  function updateSearchExport(exportState, result, rootValue, query) {
    if (result.matches.length === 0) {
      exportState?.clear('search');
      return;
    }

    exportState?.set('search', recordsForMatches(rootValue, result.matches), {
      kind: 'search',
      text: query,
    });
  }

  function ignoreSearchError() {
    return false;
  }

  async function executeSearch(options, state, clear) {
    const {
      count,
      exportState,
      indexRef,
      next,
      prev,
      revealPath,
      rootValue,
      search,
      searchResults,
      status,
    } = options;
    state.token += 1;
    const { token } = state;
    clear();
    const query = search.value.trim();
    if (!query) {
      return;
    }

    const result = await Plainview.jsonSearchRunner.runSearch({
      count,
      indexRef,
      isActive: () => token === state.token,
      needle: query.toLocaleLowerCase(),
      next,
      prev,
      query,
      revealPath,
      rootValue,
      searchResults,
      status,
    });
    if (!result || token !== state.token) {
      return;
    }
    updateSearchExport(exportState, result, rootValue, query);
    state.hits = result.hits;
    if (state.hits.length > 0) {
      state.index = selectHit(state.hits, 0, 'pv-json-hit-active');
    }
  }

  function createSearchController(options) {
    const { count, exportState, next, onClear, prev, searchResults, status } = options;
    const state = { hits: [], index: -1, timer: 0, token: 0 };

    function clear() {
      for (const hit of state.hits) {
        Plainview.jsonToolsShared.unmark(hit.entry, 'pv-json-hit');
        Plainview.jsonToolsShared.unmark(hit.entry, 'pv-json-hit-active');
      }
      state.hits = [];
      state.index = -1;
      count.textContent = '';
      prev.disabled = true;
      next.disabled = true;
      searchResults.hidden = true;
      searchResults.replaceChildren();
      exportState?.clear('search');
      onClear();
    }

    function failed(error) {
      status.textContent = `Search failed: ${error instanceof Error ? error.message : error}`;
      status.classList.add('is-error');
    }

    function step(delta) {
      if (state.hits.length === 0) {
        return;
      }
      state.index = selectHit(state.hits, state.index + delta, 'pv-json-hit-active');
    }

    function schedule() {
      globalThis.clearTimeout(state.timer);
      state.timer = globalThis.setTimeout(() => {
        executeSearch(options, state, clear).catch(failed);
      }, SearchDebounceMs);
    }

    function cancel() {
      globalThis.clearTimeout(state.timer);
    }

    return {
      cancel,
      start: () => executeSearch(options, state, clear),
      step,
      schedule,
    };
  }

  function createJsonSearch(options) {
    const elements = createSearchElements();
    const controller = createSearchController({ ...options, ...elements });
    bindResultDismiss({
      anchor: elements.searchWrap,
      list: options.searchResults,
      reopen: elements.search,
    });
    const searchClear = inputClear(elements.search, 'Clear search', () => {
      controller.cancel();
      controller.start().catch(ignoreSearchError);
    });
    elements.searchRow.insertBefore(searchClear, elements.prev);
    bindSearchEvents({
      search: elements.search,
      prev: elements.prev,
      next: elements.next,
      stepSearch: controller.step,
      scheduleSearch: controller.schedule,
    });
    return elements.searchWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonSearch });
})(globalThis);
