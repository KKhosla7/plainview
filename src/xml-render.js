/* global MDView */
(function (root) {
  'use strict';

  const MAX_NODES = 40000;
  const ELEMENT = 1;
  const TEXT = 3;
  const CDATA = 4;
  const PROCESSING_INSTRUCTION = 7;
  const COMMENT = 8;

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function span(className, text) {
    return el('span', className, text);
  }

  function meaningfulChildren(element) {
    return [...element.childNodes].filter((node) => {
      if (node.nodeType === ELEMENT) return true;
      if (node.nodeType === TEXT) return Boolean(node.nodeValue?.trim());
      return [CDATA, COMMENT, PROCESSING_INSTRUCTION].includes(node.nodeType);
    });
  }

  function openTag(element, selfClosing = false) {
    const fragment = document.createDocumentFragment();
    const tag = span('mdv-xml-tag', element.nodeName);
    if (element.namespaceURI) tag.title = element.namespaceURI;
    fragment.append(span('mdv-xml-punct', '<'), tag);

    for (const attr of [...element.attributes]) {
      fragment.append(
        document.createTextNode(' '),
        span('mdv-xml-attr-name', attr.name),
        span('mdv-xml-punct', '='),
        span('mdv-xml-attr-value', `"${attr.value}"`),
      );
    }

    fragment.append(span('mdv-xml-punct', selfClosing ? '/>' : '>'));
    return fragment;
  }

  function closeTag(element) {
    const fragment = document.createDocumentFragment();
    fragment.append(
      span('mdv-xml-punct', '</'),
      span('mdv-xml-tag', element.nodeName),
      span('mdv-xml-punct', '>'),
    );
    return fragment;
  }

  function renderEmptyElement(element) {
    const row = el('div', 'mdv-xml-leaf');
    row.append(openTag(element, true));
    return row;
  }

  function renderTextOnlyElement(element, children) {
    const row = el('div', 'mdv-xml-leaf');
    row.append(openTag(element));
    for (const child of children) {
      if (child.nodeType === CDATA) {
        row.append(span('mdv-xml-cdata', `<![CDATA[${child.nodeValue}]]>`));
      } else {
        row.append(span('mdv-xml-text', child.nodeValue.trim()));
      }
    }
    row.append(closeTag(element));
    return row;
  }

  function renderElementChildren(children, depth, ctx) {
    const body = el('div', 'mdv-xml-children');
    for (const child of children) {
      if (ctx.nodes > MAX_NODES) {
        ctx.truncated = true;
        body.append(el('div', 'mdv-tree-note', '…'));
        break;
      }
      body.append(
        child.nodeType === ELEMENT
          ? renderElement(child, depth + 1, ctx, false)
          : renderNonElement(child, ctx),
      );
    }
    return body;
  }

  function renderElementContainer(element, children, depth, ctx, isRoot) {
    const details = el('details', 'mdv-xml-node');
    details.open = isRoot || depth < 2;

    const summary = el('summary', 'mdv-xml-summary');
    summary.append(
      openTag(element),
      span('mdv-xml-count', `${children.length} nodes`),
    );
    details.append(summary, renderElementChildren(children, depth, ctx));

    const closing = el('div', 'mdv-xml-close');
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
      return el('div', 'mdv-tree-note', '…');
    }

    const children = meaningfulChildren(element);
    if (children.length === 0) return renderEmptyElement(element);

    const textOnly = children.every(
      (node) => node.nodeType === TEXT || node.nodeType === CDATA,
    );
    if (textOnly) return renderTextOnlyElement(element, children);

    return renderElementContainer(element, children, depth, ctx, isRoot);
  }

  function renderNonElement(node, ctx) {
    ctx.nodes += 1;
    if (ctx.nodes > MAX_NODES) {
      ctx.truncated = true;
      return el('div', 'mdv-tree-note', '…');
    }

    if (node.nodeType === TEXT) {
      ctx.text += 1;
      return el('div', 'mdv-xml-text-block', node.nodeValue.trim());
    }

    if (node.nodeType === CDATA) {
      ctx.text += 1;
      return el(
        'div',
        'mdv-xml-cdata-block',
        `<![CDATA[${node.nodeValue}]]>`,
      );
    }

    if (node.nodeType === COMMENT) {
      ctx.comments += 1;
      return el('div', 'mdv-xml-comment', `<!--${node.nodeValue}-->`);
    }

    if (node.nodeType === PROCESSING_INSTRUCTION) {
      return el(
        'div',
        'mdv-xml-pi',
        `<?${node.nodeName}${node.nodeValue ? ` ${node.nodeValue}` : ''}?>`,
      );
    }

    return document.createDocumentFragment();
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
    };

    const tree = el('div', 'mdv-xml');
    tree.append(renderElement(rootElement, 0, ctx, true));

    if (ctx.truncated) {
      tree.append(
        el(
          'div',
          'mdv-tree-note',
          `Tree truncated at ${MAX_NODES.toLocaleString()} nodes. Use “Source” for the full file.`,
        ),
      );
    }

    return { element: tree, stats: ctx };
  }

  root.MDView = Object.assign(root.MDView || {}, { renderXmlTree });
})(globalThis);
