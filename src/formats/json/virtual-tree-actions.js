/* global Plainview */
/*
 * Bulk expansion actions for the virtualized tree.
 */
((root) => {
  const { childEntries, entryCount, isContainer, pathTextFor } = Plainview.jsonTreeShared;

  function applyInitialOrder(state) {
    if (localStorage.getItem('plainview-jsonl-newest') === 'true' && Array.isArray(state.value)) {
      state.value = [...state.value].reverse();
    }
  }

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

  root.Plainview = Object.assign(root.Plainview || {}, {
    virtualTreeActions: { applyInitialOrder, expandAll },
  });
})(globalThis);
