/* global Plainview */
/* Windowed JSON tree: expansion state lives by path, rows mount near the viewport. */
((root) => {
  const RowHeight = 24;
  const Overscan = 8;
  const {
    actionButton,
    childEntries,
    entryCount,
    isContainer,
    pathButton,
    pathTextFor,
    renderKey,
    renderValue,
    span,
    valueClass,
  } = Plainview.jsonTreeShared;
  const { openDepth } = Plainview.jsonLimits;
  const AutoRows = 20_000;

  function createState({ value, options, indexRef, onStats, tree }) {
    return {
      activePath: '',
      autoRows: 0,
      expanded: new Set(['$']),
      frame: 0,
      indexRef,
      onStats,
      pageDepth: options.openDepth ?? openDepth(options.source.length),
      rows: [],
      rowElements: new Map(),
      stats: { arrays: 0, depth: 0, nodes: 0, objects: 0, truncated: false, values: 0 },
      tree,
      value,
    };
  }

  function primePath(state, path, nodeValue, depth) {
    if (!isContainer(nodeValue)) {
      return;
    }
    const total = entryCount(nodeValue);
    if (depth > 0 && depth >= state.pageDepth) {
      return;
    }

    const cost = total + 1;
    if (depth === 0) {
      state.autoRows = cost;
    } else {
      if (state.autoRows + cost > AutoRows) {
        return;
      }
      state.autoRows += cost;
    }
    state.expanded.add(pathTextFor(path));
    for (let index = 0; index < total; index += 1) {
      const [key, child] = childEntries(nodeValue, index);
      primePath(state, [...path, key], child, depth + 1);
    }
  }

  function flattenNode({ state, path, key, nodeValue, depth, isRoot }) {
    const pathText = pathTextFor(path);
    const container = isContainer(nodeValue);
    const total = container ? entryCount(nodeValue) : 0;
    const open = container && state.expanded.has(pathText);
    state.stats.nodes += 1;
    state.stats.depth = Math.max(state.stats.depth, depth);
    if (container) {
      if (Array.isArray(nodeValue)) {
        state.stats.arrays += 1;
      } else {
        state.stats.objects += 1;
      }

      if (!open && total > 0) {
        state.stats.truncated = true;
      }
    } else {
      state.stats.values += 1;
    }
    state.rows.push({
      container,
      depth,
      expanded: open,
      isRoot,
      key,
      path,
      pathText,
      total,
      value: nodeValue,
    });
    if (!open) {
      return;
    }

    for (let index = 0; index < total; index += 1) {
      const [childKey, childValue] = childEntries(nodeValue, index);
      flattenNode({
        state,
        path: [...path, childKey],
        key: childKey,
        nodeValue: childValue,
        depth: depth + 1,
        isRoot: false,
      });
    }
  }

  function flatten(state) {
    state.rows = [];
    state.stats.arrays = 0;
    state.stats.depth = 0;
    state.stats.nodes = 0;
    state.stats.objects = 0;
    state.stats.truncated = false;
    state.stats.values = 0;
    flattenNode({ state, path: [], key: '$', nodeValue: state.value, depth: 0, isRoot: true });
    state.tree.style.height = `${state.rows.length * RowHeight}px`;
    state.indexRef.current.clear();
    state.onStats({ ...state.stats });
  }

  function rowValue(row) {
    if (!row.container) {
      return span(valueClass(row.value), renderValue(row.value));
    }

    const label = Array.isArray(row.value)
      ? `${row.total} ${row.total === 1 ? 'item' : 'items'}`
      : `${row.total} ${row.total === 1 ? 'key' : 'keys'}`;
    return span('pv-json-count', label);
  }

  function toggleRow(state, row) {
    if (!row.container) {
      return;
    }

    if (state.expanded.has(row.pathText)) {
      state.expanded.delete(row.pathText);
    } else {
      state.expanded.add(row.pathText);
    }
    rebuild(state);
  }

  function createRow(state, row, index) {
    const node = Plainview.el('div', 'pv-vrow');
    node.style.top = `${index * RowHeight}px`;
    node.style.paddingLeft = `${8 + row.depth * 18}px`;
    node.dataset.jsonPath = row.pathText;
    node.classList.toggle('pv-vrow-active', row.pathText === state.activePath);
    if (row.container) {
      const toggle = actionButton('pv-vrow-toggle', row.expanded ? '▾' : '▸');
      toggle.setAttribute('aria-expanded', String(row.expanded));
      toggle.setAttribute('aria-label', row.expanded ? 'Collapse' : 'Expand');
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleRow(state, row);
      });
      node.append(toggle);
      node.addEventListener('click', (event) => {
        if (event.target.closest('.pv-json-path')) {
          return;
        }
        toggleRow(state, row);
      });
    } else {
      node.append(span('pv-vrow-spacer', ''));
    }

    if (row.isRoot) {
      node.append(renderKey('$'), span('pv-json-punct', ' '));
    } else {
      node.append(renderKey(row.key), span('pv-json-punct', ': '));
    }
    node.append(rowValue(row), pathButton(row.pathText));
    state.indexRef.current.set(row.pathText, {
      isContainer: row.container,
      isRoot: row.isRoot,
      node,
      path: row.path,
      pathText: row.pathText,
      summary: null,
      value: row.value,
    });
    return node;
  }

  function renderRows(state) {
    const rect = state.tree.getBoundingClientRect();
    const top = Math.max(0, -rect.top);
    const bottom = Math.min(rect.height, globalThis.innerHeight - rect.top);
    const start = Math.max(0, Math.floor(top / RowHeight) - Overscan);
    const end = Math.min(state.rows.length, Math.ceil(bottom / RowHeight) + Overscan);
    for (const [index, node] of state.rowElements) {
      if (index < start || index >= end) {
        node.remove();
        state.rowElements.delete(index);
      }
    }
    const fragment = document.createDocumentFragment();
    for (let index = start; index < end; index += 1) {
      if (state.rowElements.has(index)) {
        continue;
      }
      const node = createRow(state, state.rows[index], index);
      state.rowElements.set(index, node);
      fragment.append(node);
    }

    if (fragment.childNodes.length > 0) {
      state.tree.append(fragment);
    }
  }

  function scheduleRender(state) {
    if (state.frame) {
      return;
    }
    state.frame = globalThis.requestAnimationFrame(() => {
      state.frame = 0;
      renderRows(state);
    });
  }

  function rebuild(state) {
    flatten(state);
    state.rowElements = new Map();
    state.tree.replaceChildren();
    renderRows(state);
  }

  function revealPath(state, path) {
    state.expanded.add('$');
    const current = [];
    for (const segment of path) {
      current.push(segment);
      state.expanded.add(pathTextFor(current));
    }
    const target = pathTextFor(path);
    let index = state.rows.findIndex((row) => row.pathText === target);
    if (index < 0) {
      rebuild(state);
      index = state.rows.findIndex((row) => row.pathText === target);
    }

    if (index < 0) {
      return null;
    }
    state.activePath = target;
    rebuild(state);
    const top =
      globalThis.scrollY + state.tree.getBoundingClientRect().top + index * RowHeight - 120;
    globalThis.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    scheduleRender(state);
    return { handled: true };
  }

  function createVirtualJsonTree({ value, source, options, indexRef, onStats }) {
    const tree = Plainview.el('div', 'pv-json pv-virtual-tree');
    const state = createState({
      value,
      options: { ...options, source },
      indexRef,
      onStats,
      tree,
    });
    primePath(state, [], value, 0);
    flatten(state);
    renderRows(state);
    tree.addEventListener('pv-expand-all', () =>
      Plainview.virtualTreeActions.expandAll(state, rebuild),
    );
    tree.addEventListener('pv-collapse-all', () => {
      state.expanded.clear();
      state.activePath = '';
      rebuild(state);
    });
    const observer = new globalThis.ResizeObserver(() => scheduleRender(state));
    observer.observe(tree);
    globalThis.requestAnimationFrame(() => scheduleRender(state));
    globalThis.addEventListener('scroll', () => scheduleRender(state), { passive: true });
    globalThis.addEventListener('resize', () => scheduleRender(state));
    return {
      tree,
      context: state.stats,
      revealPath: (path) => revealPath(state, path),
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createVirtualJsonTree });
})(globalThis);
