/* global Plainview */
/* Variable-height row layout for wrapped values in the virtual JSON tree. */
((root) => {
  const RowHeight = 24;

  function applyRowTitle(node, value) {
    const text = Plainview.jsonToolsShared.primitiveText(value);
    if (text.length > 60) {
      node.title = text;
    }
  }

  function rebuildOffsets(state) {
    state.offsets = [0];
    for (let index = 0; index < state.rows.length; index += 1) {
      const height = state.heights.get(state.rows[index].pathText) ?? RowHeight;
      state.offsets.push(state.offsets[index] + height);
    }
    state.tree.style.height = `${state.offsets.at(-1)}px`;
  }

  function rowTop(state, index) {
    return state.offsets[index] ?? index * RowHeight;
  }

  function visibleRange(state, top, bottom) {
    let start = 0;
    let end = state.rows.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (state.offsets[mid + 1] <= top) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    const first = Math.max(0, start - 1);
    let last = first;
    while (last < state.rows.length && state.offsets[last] < bottom) {
      last += 1;
    }

    return { end: Math.min(state.rows.length, last + 1), start: first };
  }

  function measureRows(state, entries) {
    let changed = false;
    for (const { node, pathText } of entries) {
      const height = Math.max(RowHeight, Math.ceil(node.getBoundingClientRect().height));
      const value = node.querySelector(':scope > .pv-json-string');
      value?.classList.toggle('pv-hanging', height > RowHeight + 2);
      if ((state.heights.get(pathText) ?? RowHeight) !== height) {
        state.heights.set(pathText, height);
        changed = true;
      }
    }

    if (changed) {
      rebuildOffsets(state);
      for (const [index, node] of state.rowElements) {
        node.style.top = `${rowTop(state, index)}px`;
      }
    }
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonVirtualLayout: {
      RowHeight,
      applyRowTitle,
      measureRows,
      rebuildOffsets,
      rowTop,
      visibleRange,
    },
  });
})(globalThis);
