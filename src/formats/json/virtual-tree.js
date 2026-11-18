/* global Plainview */
((root) => {
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
  const { filterRelevant, setFilter } = Plainview.jsonVirtualFilter;
  const { AutoRows, createState } = Plainview.jsonVirtualState;
  const { RowHeight, applyRowTitle, measureRows, rebuildOffsets, rowTop, visibleRange } =
    Plainview.jsonVirtualLayout;
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
    if (!filterRelevant(state, pathText, path)) {
      return;
    }
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
    rebuildOffsets(state);
    state.indexRef.current.clear();
    state.onStats({ ...state.stats });
  }

  function rowValue(state, row) {
    if (!row.container) {
      return [span(valueClass(row.value), renderValue(row.value, state.syntax))];
    }

    const array = Array.isArray(row.value);
    const noun = array ? 'item' : 'key';
    const label = `${row.total} ${noun}${row.total === 1 ? '' : 's'}`;
    return [
      span('pv-json-punct', array ? '[' : '{'),
      span('pv-json-count', label),
      span('pv-json-punct', array ? ']' : '}'),
    ];
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
    node.style.top = `${rowTop(state, index)}px`;
    node.style.paddingLeft = `${8 + row.depth * 18}px`;
    node.dataset.jsonPath = row.pathText;
    node.classList.toggle('pv-vrow-active', row.pathText === state.activePath);

    if (state.filterPaths?.has(row.pathText)) {
      node.classList.add(state.filterHitClass || 'pv-json-hit');
    }

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
      node.append(renderKey('$', state.syntax), span('pv-json-punct', ' '));
    } else {
      node.append(renderKey(row.key, state.syntax), span('pv-json-punct', ': '));
    }
    node.append(...rowValue(state, row), pathButton(row.pathText));
    if (!row.container) {
      applyRowTitle(node, row.value);
    }
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
    const top = Math.max(0, -rect.top - Overscan * RowHeight);
    const bottom = Math.min(rect.height, globalThis.innerHeight - rect.top + Overscan * RowHeight);
    const range = visibleRange(state, top, bottom);
    const { start, end } = range;
    for (const [index, node] of state.rowElements) {
      if (index < start || index >= end) {
        node.remove();
        state.rowElements.delete(index);
      }
    }

    const fragment = document.createDocumentFragment();
    const measured = [];
    for (let index = start; index < end; index += 1) {
      if (state.rowElements.has(index)) {
        continue;
      }
      const node = createRow(state, state.rows[index], index);
      state.rowElements.set(index, node);
      fragment.append(node);
      measured.push({ node, pathText: state.rows[index].pathText });
    }

    if (fragment.childNodes.length > 0) {
      state.tree.append(fragment);
      measureRows(state, measured);
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
    const offset = Plainview.jsonToolsShared.stickyOffset();
    const top =
      globalThis.scrollY + state.tree.getBoundingClientRect().top + index * RowHeight - offset;
    globalThis.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    renderRows(state);
    scheduleRender(state);
    return { handled: true };
  }
  function createVirtualJsonTree({ value, source, options, indexRef, onStats }) {
    const tree = Plainview.el('div', 'pv-json pv-virtual-tree pv-json-virtual');
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
    tree.addEventListener('pv-jsonl-order', () => {
      state.value = [...state.value].reverse();
      state.expanded.clear();
      rebuild(state);
    });
    tree.addEventListener('pv-expand-all', () =>
      Plainview.virtualTreeActions.expandAll(state, rebuild),
    );
    tree.addEventListener('pv-collapse-all', () => {
      state.expanded.clear();
      state.activePath = '';
      rebuild(state);
    });
    tree.addEventListener('pv-json-filter', (event) => {
      setFilter(state, event.detail.paths, rebuild, event.detail.hitClass);
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
