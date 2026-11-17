/* global Plainview */
/*
 * Builds the bounded JSON tree, including progressive node loading.
 */
((root) => {
  const { MaxNodeLimit, firstNodeLimit, nodeChunk } = Plainview.jsonLimits;
  const { el } = Plainview;

  function span(className, text) {
    return el('span', className, text);
  }

  function actionButton(className, label) {
    const node = el('button', className, label);
    node.type = 'button';
    return node;
  }

  function valueClass(value) {
    if (value === null) {
      return 'pv-json-null';
    }

    if (Plainview.valueKind(value) === 'string') {
      return 'pv-json-string';
    }

    if (Plainview.valueKind(value) === 'number') {
      return 'pv-json-number';
    }

    if (Plainview.valueKind(value) === 'boolean') {
      return 'pv-json-boolean';
    }

    return 'pv-json-boolean';
  }

  function renderValue(value) {
    if (Plainview.valueKind(value) === 'string') {
      return JSON.stringify(value);
    }

    if (value === null) {
      return 'null';
    }

    return String(value);
  }

  function renderKey(key) {
    if (Plainview.valueKind(key) === 'number') {
      return span('pv-json-index', String(key));
    }

    return span('pv-json-key', JSON.stringify(key));
  }

  function pathButton(pathText) {
    const node = el('button', 'pv-json-path', '⧉');
    node.type = 'button';
    node.title = `Copy path ${pathText}`;
    node.setAttribute('aria-label', `Copy path ${pathText}`);
    node.setAttribute('data-json-path', pathText);
    return node;
  }

  function registerNode({ ctx, path, node, value, isContainer, summary }) {
    const pathText = Plainview.jsonPath.pathToJsonPath(path);
    ctx.byPath.set(pathText, {
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
    const { isLast, isRoot, path } = meta;
    const row = el('div', 'pv-json-leaf');
    if (!isRoot) {
      row.append(renderKey(key), span('pv-json-punct', ': '));
    }
    row.append(span(valueClass(value), renderValue(value)));
    if (!isLast) {
      row.append(span('pv-json-punct', ','));
    }
    row.append(pathButton(Plainview.jsonPath.pathToJsonPath(path)));
    registerNode({ ctx, path, node: row, value, isContainer: false, summary: null });
    return row;
  }

  function renderSummary(key, array, count, meta) {
    const { isLast, isRoot, path } = meta;
    const summary = el('summary', 'pv-json-summary');
    if (!isRoot) {
      summary.append(renderKey(key), span('pv-json-punct', ': '));
    }
    summary.append(
      span('pv-json-punct', array ? '[' : '{'),
      span('pv-json-count', `${count} ${array ? 'items' : 'keys'}`),
      span('pv-json-punct', array ? ']' : '}'),
    );
    if (!isLast) {
      summary.append(span('pv-json-punct', ','));
    }
    summary.append(pathButton(Plainview.jsonPath.pathToJsonPath(path)));
    return summary;
  }

  function renderChildren(entries, depth, ctx, parentPath) {
    const children = el('div', 'pv-json-children');
    for (let i = 0; i < entries.length; i += 1) {
      if (ctx.nodes >= ctx.limit) {
        ctx.truncated = true;
        children.append(el('div', 'pv-tree-note', '…'));
        break;
      }
      const [childKey, childValue] = entries[i];
      children.append(
        renderNode(
          childKey,
          childValue,
          {
            depth: depth + 1,
            isLast: i === entries.length - 1,
            path: [...parentPath, childKey],
            isRoot: false,
          },
          ctx,
          false,
        ),
      );
    }

    return children;
  }

  function renderContainer(key, value, meta, ctx) {
    const { depth, path, isRoot } = meta;
    if (ctx.stack.has(value)) {
      ctx.values += 1;
      return renderLeaf(key, '[circular]', meta, ctx);
    }
    ctx.stack.add(value);
    const array = Array.isArray(value);
    if (array) {
      ctx.arrays += 1;
    } else {
      ctx.objects += 1;
    }

    const entries = array ? value.map((item, index) => [index, item]) : Object.entries(value);
    const details = el('details', 'pv-json-node');
    details.open = isRoot || depth < 2;
    details.setAttribute('data-json-path', Plainview.jsonPath.pathToJsonPath(path));
    const summary = renderSummary(key, array, entries.length, meta);
    details.append(summary);
    details.append(renderChildren(entries, depth, ctx, path));
    registerNode({ ctx, path, node: details, value, isContainer: true, summary });
    ctx.stack.delete(value);
    return details;
  }

  function renderNode(key, value, meta, ctx, isRoot) {
    const { depth, isLast, path } = meta;
    ctx.depth = Math.max(ctx.depth, depth);
    ctx.nodes += 1;
    if (ctx.nodes > ctx.limit) {
      ctx.truncated = true;
      return el('div', 'pv-tree-note', '…');
    }

    const nodeMeta = { depth, isLast, path, isRoot };
    const isContainer = value !== null && Plainview.valueKind(value) === 'object';
    if (!isContainer) {
      ctx.values += 1;
      return renderLeaf(key, value, nodeMeta, ctx);
    }

    return renderContainer(key, value, nodeMeta, ctx);
  }

  function treeWasTruncated(treeState) {
    return treeState.truncated;
  }

  function createJsonTree({ value, source, options, indexRef, onStats }) {
    const tree = el('div', 'pv-json');
    const chunk = nodeChunk(source.length);

    function renderTree(limit) {
      const openState = new Map();
      for (const details of tree.querySelectorAll('details[data-json-path]')) {
        openState.set(details.getAttribute('data-json-path'), details.open);
      }
      const context = {
        nodes: 0,
        objects: 0,
        arrays: 0,
        values: 0,
        depth: 0,
        truncated: false,
        limit,
        byPath: new Map(),
        stack: new WeakSet(),
      };
      const rootNode = renderNode('$', value, { depth: 0, isLast: true, path: [] }, context, true);
      const parts = [rootNode];
      if (treeWasTruncated(context)) {
        const note = el('div', 'pv-tree-note');
        note.append(`Tree capped at ${context.nodes.toLocaleString()} nodes. `);
        if (limit < MaxNodeLimit) {
          const more = actionButton(
            'pv-meta-button pv-tree-more',
            `Load next ${chunk.toLocaleString()} nodes`,
          );
          more.addEventListener('click', () => {
            more.disabled = true;
            more.textContent = 'Loading…';
            globalThis.setTimeout(() => renderTree(Math.min(limit + chunk, MaxNodeLimit)), 0);
          });
          note.append(more);
        } else {
          note.append('Maximum tree size reached; use “Source” for the full file.');
        }
        parts.push(note);
      }
      tree.replaceChildren(...parts);
      indexRef.current = context.byPath;
      if (openState.size > 0) {
        for (const details of tree.querySelectorAll('details[data-json-path]')) {
          const path = details.getAttribute('data-json-path');
          if (openState.has(path)) {
            details.open = openState.get(path);
          }
        }
      }
      onStats(context);
      return context;
    }

    const initialLimit = Math.max(
      1,
      Math.min(options.nodeLimit || firstNodeLimit(source.length), MaxNodeLimit),
    );
    const context = renderTree(initialLimit);
    return { tree, context };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonTree });
})(globalThis);
