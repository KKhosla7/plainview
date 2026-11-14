/* global MDView */
(function (root) {
  'use strict';

  const MAX_NODES = 40000;

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function span(className, text) {
    return el('span', className, text);
  }

  function valueClass(value) {
    if (value === null) return 'mdv-json-null';
    if (typeof value === 'string') return 'mdv-json-string';
    if (typeof value === 'number') return 'mdv-json-number';
    if (typeof value === 'boolean') return 'mdv-json-boolean';
    return 'mdv-json-value';
  }

  function renderValue(value) {
    if (typeof value === 'string') return JSON.stringify(value);
    if (value === null) return 'null';
    return String(value);
  }

  function renderKey(key) {
    if (typeof key === 'number') {
      return span('mdv-json-index', String(key));
    }
    return span('mdv-json-key', JSON.stringify(key));
  }

  function renderLeaf(key, value, isLast, isRoot) {
    const row = el('div', 'mdv-json-leaf');
    if (!isRoot) row.append(renderKey(key), span('mdv-json-punct', ': '));
    row.append(span(valueClass(value), renderValue(value)));
    if (!isLast) row.append(span('mdv-json-punct', ','));
    return row;
  }

  function renderSummary(key, array, count, isLast, isRoot) {
    const summary = el('summary', 'mdv-json-summary');
    if (!isRoot) summary.append(renderKey(key), span('mdv-json-punct', ': '));
    summary.append(
      span('mdv-json-punct', array ? '[' : '{'),
      span('mdv-json-count', `${count} ${array ? 'items' : 'keys'}`),
      span('mdv-json-punct', array ? ']' : '}'),
    );
    if (!isLast) summary.append(span('mdv-json-punct', ','));
    return summary;
  }

  function renderChildren(entries, depth, ctx) {
    const children = el('div', 'mdv-json-children');
    for (let i = 0; i < entries.length; i += 1) {
      if (ctx.nodes > MAX_NODES) {
        ctx.truncated = true;
        children.append(el('div', 'mdv-tree-note', '…'));
        break;
      }
      const [childKey, childValue] = entries[i];
      children.append(
        renderNode(
          childKey,
          childValue,
          depth + 1,
          i === entries.length - 1,
          ctx,
          false,
        ),
      );
    }
    return children;
  }

  function renderContainer(key, value, depth, isLast, ctx, isRoot) {
    const array = Array.isArray(value);
    if (array) ctx.arrays += 1;
    else ctx.objects += 1;

    const entries = array
      ? value.map((item, index) => [index, item])
      : Object.entries(value);

    const details = el('details', 'mdv-json-node');
    details.open = isRoot || depth < 2;
    details.append(renderSummary(key, array, entries.length, isLast, isRoot));
    details.append(renderChildren(entries, depth, ctx));
    return details;
  }

  function renderNode(key, value, depth, isLast, ctx, isRoot) {
    ctx.depth = Math.max(ctx.depth, depth);
    ctx.nodes += 1;

    if (ctx.nodes > MAX_NODES) {
      ctx.truncated = true;
      return el('div', 'mdv-tree-note', '…');
    }

    const isContainer = value !== null && typeof value === 'object';
    if (!isContainer) {
      ctx.values += 1;
      return renderLeaf(key, value, isLast, isRoot);
    }

    return renderContainer(key, value, depth, isLast, ctx, isRoot);
  }

  function buildJson(source) {
    const parsed = MDView.parseJson(source);
    const article = el('article', 'mdv-doc mdv-data-doc');

    if (parsed.error) {
      article.append(
        el('div', 'mdv-doc-title', 'Invalid JSON'),
        MDView.errorPanel(
          parsed.error.message,
          parsed.error.line,
          parsed.error.column,
        ),
      );
      return { article, stats: null, error: true };
    }

    const ctx = {
      nodes: 0,
      objects: 0,
      arrays: 0,
      values: 0,
      depth: 0,
      truncated: false,
    };

    const tree = el('div', 'mdv-json');
    tree.append(renderNode('$', parsed.value, 0, true, ctx, true));

    if (ctx.truncated) {
      tree.append(
        el(
          'div',
          'mdv-tree-note',
          `Tree truncated at ${MAX_NODES.toLocaleString()} nodes. Use “Source” for the full file.`,
        ),
      );
    }

    article.append(
      MDView.createDataToolbar({
        article,
        source,
        summary:
          `${ctx.nodes.toLocaleString()} nodes · ${MDView.formatBytes(source.length)}` +
          (parsed.jsonc ? ' · JSONC' : ''),
        copyLabel: 'Copy JSON',
      }),
      tree,
    );
    return { article, stats: ctx, error: false };
  }

  root.MDView = Object.assign(root.MDView || {}, { buildJson });
})(globalThis);
