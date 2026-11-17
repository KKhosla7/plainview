/* global Plainview */
/* Filtering helpers for the virtualized JSON tree. */
((root) => {
  const { pathTextFor } = Plainview.jsonTreeShared;

  function filterRelevant(state, pathText) {
    if (!state.filterPaths) {
      return true;
    }

    return state.filterPaths.some(
      (filterPath) =>
        pathText === filterPath ||
        pathText.startsWith(`${filterPath}.`) ||
        pathText.startsWith(`${filterPath}[`) ||
        filterPath.startsWith(`${pathText}.`) ||
        filterPath.startsWith(`${pathText}[`),
    );
  }

  function setFilter(state, paths, rebuild, hitClass) {
    if (!paths || paths.length === 0) {
      state.filterPaths = null;
      state.filterHitClass = '';
      rebuild(state);
      return;
    }

    state.filterHitClass = hitClass || 'pv-json-hit';
    state.filterPaths = paths.map((path) => pathTextFor(path));
    for (const path of paths) {
      for (let index = 0; index <= path.length; index += 1) {
        state.expanded.add(pathTextFor(path.slice(0, index)));
      }
    }
    rebuild(state);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonVirtualFilter: { filterRelevant, setFilter },
  });
})(globalThis);
