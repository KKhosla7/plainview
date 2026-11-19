import { pathTextFor } from './tree-model.js';

function filterRelevant(state, pathText, path) {
  if (!state.filterPaths) {
    return true;
  }

  if (state.filterPaths.has(pathText) || state.filterAncestors.has(pathText)) {
    return true;
  }

  for (let index = path.length - 1; index >= 0; index -= 1) {
    if (state.filterPaths.has(pathTextFor(path.slice(0, index)))) {
      return true;
    }
  }

  return false;
}

function setFilter(state, paths, rebuild, hitClass) {
  if (!paths || paths.length === 0) {
    state.filterPaths = null;
    state.filterAncestors = null;
    state.filterHitClass = '';
    rebuild(state);
    return;
  }

  state.filterHitClass = hitClass || 'pv-json-hit';
  state.filterPaths = new Set();
  state.filterAncestors = new Set();
  for (const path of paths) {
    state.filterPaths.add(pathTextFor(path));
    for (let index = 0; index <= path.length; index += 1) {
      const pathText = pathTextFor(path.slice(0, index));
      state.expanded.add(pathText);
      state.filterAncestors.add(pathText);
    }
  }
  rebuild(state);
}

export const jsonVirtualFilter = { filterRelevant, setFilter };
