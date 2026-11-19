import { jsonToolsShared } from '../.././formats/json/tools-shared.js';
import { xmlToolsShared } from '../.././formats/xml/tools-shared.js';

const { el, button, exportNode, searchText, mark, unmark, selectHit, SEARCH_DEBOUNCE_MS } =
  xmlToolsShared;

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

function ensureSearchIndex(byNode) {
  byNode.ensureAll?.();
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
  return { count, next, prev, search, searchRow, searchWrap };
}

function clearXmlSearch(state, controls, exportState) {
  for (const hit of state.hits) {
    unmark(hit, 'pv-xml-hit');
    unmark(hit, 'pv-xml-hit-active');
  }
  state.hits = [];
  state.index = -1;
  exportState?.clear('search');
  controls.count.textContent = '';
  controls.prev.disabled = true;
  controls.next.disabled = true;
}

function runXmlSearch({ state, controls, byNode, exportState, status }) {
  clearXmlSearch(state, controls, exportState);
  status.textContent = '';
  status.className = 'pv-json-status';
  const value = controls.search.value.trim();
  if (!value) {
    return;
  }
  const needle = value.toLocaleLowerCase();
  ensureSearchIndex(byNode);
  for (const [node, entry] of byNode) {
    if (!searchText(node).toLocaleLowerCase().includes(needle)) {
      continue;
    }
    state.hits.push(entry);
    mark(entry, 'pv-xml-hit');
  }
  controls.count.textContent = `${state.hits.length} ${state.hits.length === 1 ? 'match' : 'matches'}`;
  controls.prev.disabled = state.hits.length === 0;
  controls.next.disabled = state.hits.length === 0;
  if (state.hits.length > 0) {
    exportState?.set(
      'search',
      state.hits.flatMap((entry) => {
        const node = exportNode(entry.source);
        return node ? [node] : [];
      }),
      { kind: 'search', text: value },
    );
    state.index = selectHit(state.hits, 0, 'pv-xml-hit-active');
  } else {
    status.textContent = `No elements or text matched ${value}.`;
    status.classList.add('is-empty');
  }
}

function createXmlSearch({ byNode, exportState, status }) {
  const { count, next, prev, search, searchRow, searchWrap } = createSearchElements();
  const state = { hits: [], index: -1 };
  let searchTimer = 0;
  const controls = { count, next, prev, search };

  function clearStatus() {
    status.textContent = '';
    status.className = 'pv-json-status';
  }

  function runSearch() {
    runXmlSearch({ state, controls, byNode, exportState, status });
  }

  function stepSearch(delta) {
    if (state.hits.length === 0) {
      return;
    }
    state.index = selectHit(state.hits, state.index + delta, 'pv-xml-hit-active');
  }

  function scheduleSearch() {
    globalThis.clearTimeout(searchTimer);
    searchTimer = globalThis.setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  const clear = jsonToolsShared.inputClear(search, 'Clear XML search', () => {
    search.value = '';
    clearXmlSearch(state, controls, exportState);
    clearStatus();
    search.focus();
  });
  searchRow.insertBefore(clear, prev);
  bindSearchEvents({ search, prev, next, stepSearch, scheduleSearch });
  return searchWrap;
}

export { createXmlSearch };
