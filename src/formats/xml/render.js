import {
  CDATA,
  COMMENT,
  closeTag,
  ELEMENT,
  el,
  MAX_NODES,
  meaningfulChildren,
  openTag,
  PROCESSING_INSTRUCTION,
  pathButton,
  TEXT,
} from './tree-shared.js';

function register(ctx, sourceNode, rendered, summary = null) {
  ctx.byNode.set(sourceNode, { node: rendered, source: sourceNode, summary });
}

function renderEmptyELEMENT(element, ctx) {
  const row = el('div', 'pv-xml-leaf');
  row.append(openTag(element, true), pathButton(element, ctx.rootElement));
  register(ctx, element, row);
  return row;
}

function renderTEXTOnlyELEMENT(element, children, ctx) {
  const row = el('div', 'pv-xml-leaf');
  row.append(openTag(element));
  for (const child of children) {
    if (child.nodeType === CDATA) {
      row.append(el('span', 'pv-xml-cdata', `<![CDATA[${child.nodeValue}]]>`));
    } else {
      row.append(el('span', 'pv-xml-text', child.nodeValue.trim()));
    }
    register(ctx, child, row);
  }
  row.append(closeTag(element), pathButton(element, ctx.rootElement));
  register(ctx, element, row);
  return row;
}

function renderElementChildren(children, depth, ctx) {
  const body = el('div', 'pv-xml-children');
  for (const child of children) {
    if (ctx.nodes > MAX_NODES) {
      ctx.truncated = true;
      body.append(el('div', 'pv-tree-note', '…'));
      break;
    }
    body.append(
      child.nodeType === ELEMENT
        ? renderElement(child, depth + 1, ctx, false)
        : renderNonELEMENT(child, ctx),
    );
  }

  return body;
}

function renderElementContainer(element, children, depth, ctx, isRoot) {
  const details = el('details', 'pv-xml-node');
  details.open = isRoot || depth < 2;

  const summary = el('summary', 'pv-xml-summary');
  summary.append(
    openTag(element),
    el('span', 'pv-xml-count', `${children.length} nodes`),
    pathButton(element, ctx.rootElement),
  );
  details.append(summary, renderElementChildren(children, depth, ctx));
  register(ctx, element, details, summary);

  const closing = el('div', 'pv-xml-close');
  closing.append(closeTag(element));
  details.append(closing);
  return details;
}

function renderElement(element, depth, ctx, isRoot) {
  ctx.depth = Math.max(ctx.depth, depth);
  ctx.nodes += 1;
  ctx.elements += 1;
  ctx.attributes += element.attributes.length;

  if (ctx.nodes > MAX_NODES) {
    ctx.truncated = true;
    return el('div', 'pv-tree-note', '…');
  }

  const children = meaningfulChildren(element);
  if (children.length === 0) {
    return renderEmptyELEMENT(element, ctx);
  }

  const textOnly = children.every((node) => node.nodeType === TEXT || node.nodeType === CDATA);
  if (textOnly) {
    return renderTEXTOnlyELEMENT(element, children, ctx);
  }

  return renderElementContainer(element, children, depth, ctx, isRoot);
}

function renderNonELEMENT(node, ctx) {
  ctx.nodes += 1;
  if (ctx.nodes > MAX_NODES) {
    ctx.truncated = true;
    return el('div', 'pv-tree-note', '…');
  }

  if (node.nodeType === TEXT) {
    ctx.text += 1;
    const row = el('div', 'pv-xml-text-block', node.nodeValue.trim());
    register(ctx, node, row);
    return row;
  }

  if (node.nodeType === CDATA) {
    ctx.text += 1;
    const row = el('div', 'pv-xml-cdata-block', `<![CDATA[${node.nodeValue}]]>`);
    register(ctx, node, row);
    return row;
  }

  if (node.nodeType === COMMENT) {
    ctx.comments += 1;
    const row = el('div', 'pv-xml-comment', `\x3C!--${node.nodeValue}-->`);
    register(ctx, node, row);
    return row;
  }

  if (node.nodeType === PROCESSING_INSTRUCTION) {
    const row = el(
      'div',
      'pv-xml-pi',
      `<?${node.nodeName}${node.nodeValue ? ` ${node.nodeValue}` : ''}?>`,
    );
    register(ctx, node, row);
    return row;
  }

  return document.createDocumentFragment();
}

function treeWasTruncated(context) {
  return context.truncated;
}

function renderXmlTree(rootElement) {
  const ctx = {
    nodes: 0,
    elements: 0,
    attributes: 0,
    text: 0,
    comments: 0,
    depth: 0,
    truncated: false,
    byNode: new Map(),
    rootElement,
  };

  const tree = el('div', 'pv-xml');
  tree.append(renderElement(rootElement, 0, ctx, true));

  if (treeWasTruncated(ctx)) {
    const note = `Tree truncated at ${MAX_NODES.toLocaleString()} nodes. Use “Source” for the full file.`;
    tree.append(el('div', 'pv-tree-note', note));
  }

  return { element: tree, stats: ctx, byNode: ctx.byNode };
}

export const xmlTreeShared = {
  CDATA,
  COMMENT,
  ELEMENT,
  MAX_NODES,
  PROCESSING_INSTRUCTION,
  TEXT,
  closeTag,
  meaningfulChildren,
  openTag,
  pathButton,
};

export { renderXmlTree };
