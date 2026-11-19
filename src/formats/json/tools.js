import { copyText } from '../../core/clipboard.js';
import { onAsync } from '../../core/events.js';
import { jsonToolsShared } from '../.././formats/json/tools-shared.js';

/* global Plainview */
/*
 * Search and query toolbar for the JSON/YAML tree. Controls live in focused
 * modules; this file composes them and handles path copying.
 */
((root) => {
  const { el, CopyResetMs, clearStatus } = jsonToolsShared;

  function createJsonTools({ tree, rootValue, indexRef, revealPath, exportState }) {
    const tools = el('div', 'pv-json-tools');
    const status = el('div', 'pv-json-status');
    status.setAttribute('role', 'status');
    const searchResults = el('div', 'pv-json-search-results');
    searchResults.hidden = true;
    const queryResults = el('div', 'pv-json-search-results pv-json-query-results');
    queryResults.hidden = true;

    const search = Plainview.createJsonSearch({
      rootValue,
      indexRef,
      revealPath,
      exportState,
      status,
      searchResults,
      tree,
      onClear() {
        exportState.clear('query');
        queryResults.hidden = true;
        queryResults.replaceChildren();
        clearStatus(status);
      },
    });
    const query = Plainview.createJsonQuery({
      rootValue,
      indexRef,
      revealPath,
      exportState,
      status,
      queryResults,
      tree,
      onStart() {
        exportState.clear('search');
        searchResults.hidden = true;
      },
    });

    onAsync(tree, 'click', async (event) => {
      const target = event.target?.closest?.('.pv-json-path') ?? null;
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const path = target.getAttribute('data-json-path') || '';
      const ok = await copyText(path);
      const previous = target.textContent;
      target.textContent = ok ? 'Copied' : 'Failed';
      globalThis.setTimeout(() => {
        target.textContent = previous;
      }, CopyResetMs);
    });

    tools.append(search, query, status, searchResults, queryResults);
    return tools;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonTools });
})(globalThis);
