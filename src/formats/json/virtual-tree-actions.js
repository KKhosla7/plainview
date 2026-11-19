import { jsonTreeShared } from '../.././formats/json/tree-shared.js';

/*
 * Bulk expansion actions for the virtualized tree.
 */
const { childEntries, entryCount, isContainer, pathTextFor } = jsonTreeShared;

function expandAll(state, rebuild) {
  const seen = new WeakSet();
  function walk(nodeValue, path) {
    if (!isContainer(nodeValue) || seen.has(nodeValue)) {
      return;
    }

    seen.add(nodeValue);
    state.expanded.add(pathTextFor(path));
    for (let index = 0; index < entryCount(nodeValue); index += 1) {
      const [key, child] = childEntries(nodeValue, index);
      walk(child, [...path, key]);
    }
  }

  walk(state.value, []);
  rebuild(state);
}

export const virtualTreeActions = { expandAll };
