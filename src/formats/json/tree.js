import { el } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';

/* global Plainview */
/*
 * Lazily materialized JSON tree. Closed containers create only their summary;
 * opening one renders a small page of children. Search can reveal a path by
 * opening its ancestors without rendering unrelated branches.
 */
((root) => {
  const { autoOpenChildLimit, openDepth, pageSize } = Plainview.jsonLimits;

  const { actionButton, pathButton, renderKey, renderValue, span, treeSyntax, valueClass } =
    Plainview.jsonTreeShared;

  function registerNode(ctx, { path, node, value, isContainer, summary }) {
    const pathText = Plainview.jsonPath.pathToJsonPath(path);
    ctx.indexRef.current.set(pathText, {
      node,
      summary,
      value,
      path,
      isContainer,
      isRoot: path.length === 0,
      pathText,
    });
  }

  function renderLeaf(key, value, meta, ctx) {
    const { isRoot, path } = meta;
    const row = el('div', 'pv-json-leaf');
    if (isRoot) {
      row.append(renderKey('$', ctx.syntax), span('pv-json-punct', ' '));
    } else {
      row.append(renderKey(key, ctx.syntax), span('pv-json-punct', ': '));
    }
    const valueBox = el('span', 'pv-json-value');
    valueBox.append(span(valueClass(value), renderValue(value, ctx.syntax)));
    row.append(valueBox, pathButton(Plainview.jsonPath.pathToJsonPath(path)));
    registerNode(ctx, { path, node: row, value, isContainer: false, summary: null });
    return row;
  }

  function countLabel(count, array) {
    if (array) {
      return count === 1 ? 'item' : 'items';
    }

    return count === 1 ? 'key' : 'keys';
  }

  function renderSummary(key, array, count, meta) {
    const { isRoot, path } = meta;
    const summary = el('summary', 'pv-json-summary');
    if (isRoot) {
      summary.append(renderKey('$', meta.syntax), span('pv-json-punct', ' '));
    } else {
      summary.append(renderKey(key, meta.syntax), span('pv-json-punct', ': '));
    }
    summary.append(
      span('pv-json-punct', array ? '[ ' : '{ '),
      span('pv-json-count', `${count} ${countLabel(count, array)}`),
      span('pv-json-punct', array ? ' ]' : ' }'),
    );
    summary.append(pathButton(Plainview.jsonPath.pathToJsonPath(path)));
    return summary;
  }

  function childEntry(state, index) {
    const key = state.array ? index : state.keys[index];
    return [key, state.value[key]];
  }

  function updateMoreButton(state, ctx) {
    state.moreButton?.remove();
    state.moreButton = null;
    if (state.rendered >= state.total) {
      return;
    }
    const remaining = state.total - state.rendered;
    const more = actionButton(
      'pv-meta-button pv-tree-more',
      `Show next ${Math.min(ctx.pageSize, remaining).toLocaleString()}`,
    );
    more.addEventListener('click', () => {
      more.disabled = true;
      materializePage(state, ctx);
    });
    state.children.append(more);
    state.moreButton = more;
    ctx.stats.truncated = true;
  }

  function materializePage(state, ctx) {
    const end = Math.min(state.rendered + ctx.pageSize, state.total);
    const fragment = document.createDocumentFragment();
    for (let index = state.rendered; index < end; index += 1) {
      const [key, value] = childEntry(state, index);
      fragment.append(
        renderNode(
          key,
          value,
          {
            depth: state.depth + 1,
            isLast: index === state.total - 1,
            path: [...state.path, key],
            isRoot: false,
            chain: state.chain,
          },
          ctx,
          false,
        ),
      );
    }
    state.rendered = end;
    state.loaded = true;
    if (!state.completed && state.rendered >= state.total) {
      state.completed = true;
      ctx.pending -= 1;
    }

    if (state.moreButton) {
      state.children.insertBefore(fragment, state.moreButton);
    } else {
      state.children.append(fragment);
    }
    updateMoreButton(state, ctx);
    ctx.report();
  }

  function renderContainer(key, value, meta, ctx) {
    const { depth, path } = meta;
    const array = Array.isArray(value);
    const keys = array ? null : Object.keys(value);
    const total = array ? value.length : keys.length;
    if (array) {
      ctx.stats.arrays += 1;
    } else {
      ctx.stats.objects += 1;
    }

    const pathText = Plainview.jsonPath.pathToJsonPath(path);
    const details = el('details', 'pv-json-node');
    details.open = Boolean(
      meta.isRoot || (depth < ctx.openDepth && total <= ctx.autoOpenChildLimit),
    );
    details.setAttribute('data-json-path', pathText);
    const summary = renderSummary(key, array, total, { ...meta, syntax: ctx.syntax });
    const children = el('div', 'pv-json-children');
    details.append(summary, children);
    const state = {
      array,
      chain: [...meta.chain, value],
      children,
      depth,
      details,
      keys,
      completed: total === 0,
      loaded: false,
      moreButton: null,
      path,
      pathText,
      rendered: 0,
      total,
      value,
    };
    ctx.states.set(pathText, state);
    if (total > 0) {
      ctx.pending += 1;
    }
    registerNode(ctx, { path, node: details, value, isContainer: true, summary });
    details.addEventListener('toggle', () => {
      if (details.open && !state.loaded) {
        materializePage(state, ctx);
      }
    });
    if (details.open) {
      materializePage(state, ctx);
    }

    return details;
  }

  function renderNode(key, value, meta, ctx, isRoot) {
    const { depth, path } = meta;
    ctx.depth = Math.max(ctx.depth, depth);
    ctx.stats.nodes += 1;
    ctx.stats.depth = Math.max(ctx.stats.depth, depth);
    const isContainer = value !== null && valueKind(value) === 'object';
    if (isContainer && meta.chain.includes(value)) {
      ctx.stats.values += 1;
      return renderLeaf(key, '[circular]', meta, ctx);
    }

    if (!isContainer) {
      ctx.stats.values += 1;
      return renderLeaf(key, value, meta, ctx);
    }

    return renderContainer(key, value, { ...meta, path, isRoot: Boolean(isRoot) }, ctx);
  }

  function pathAllowed(pathText, filterPaths) {
    return filterPaths.some(
      (filterPath) =>
        pathText === filterPath ||
        pathText.startsWith(`${filterPath}.`) ||
        pathText.startsWith(`${filterPath}[`) ||
        filterPath.startsWith(`${pathText}.`) ||
        filterPath.startsWith(`${pathText}[`),
    );
  }

  function applyClassicFilter({ paths, tree }) {
    const filterPaths = paths.map((path) => Plainview.jsonPath.pathToJsonPath(path));
    for (const node of tree.querySelectorAll('.pv-json-leaf, .pv-json-node')) {
      const pathText =
        node.dataset.jsonPath || node.querySelector('.pv-json-path')?.dataset.jsonPath || '';
      node.hidden = !pathAllowed(pathText, filterPaths);
    }
  }

  function createJsonTree({ value, source, options, indexRef, onStats }) {
    const tree = el('div', 'pv-json');
    const ctx = {
      syntax: treeSyntax(options.exportFormatId),
      autoOpenChildLimit: options.autoOpenChildLimit ?? autoOpenChildLimit,
      indexRef,
      openDepth: options.openDepth ?? openDepth(source.length),
      pageSize: options.pageSize ?? pageSize(source.length),
      pending: 0,
      materializePage: null,
      report() {
        this.stats.truncated = this.pending > 0;
        onStats({ ...this.stats });
      },
      states: new Map(),
      stats: {
        arrays: 0,
        depth: 0,
        nodes: 0,
        objects: 0,
        truncated: false,
        values: 0,
      },
    };
    ctx.materializePage = (state) => materializePage(state, ctx);
    const rootNode = renderNode(
      '$',
      value,
      { chain: [], depth: 0, isLast: true, isRoot: true, path: [] },
      ctx,
      true,
    );
    tree.append(rootNode);
    ctx.report();
    const revealPath = Plainview.jsonTreeReveal.createReveal(ctx);
    tree.addEventListener('pv-json-filter', (event) => {
      if ((event.detail.paths || []).length === 0) {
        for (const node of tree.querySelectorAll('.pv-json-leaf[hidden], .pv-json-node[hidden]')) {
          node.hidden = false;
        }

        return;
      }

      applyClassicFilter({ paths: event.detail.paths || [], tree });
    });
    return { tree, context: ctx.stats, revealPath };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonTree });
})(globalThis);
