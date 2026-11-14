/* global Plainview */
(function (root) {
  'use strict';

  const MAX_NODES = 40000;
  const ELEMENT = 1;
  const TEXT = 3;
  const CDATA = 4;
  const PROCESSING_INSTRUCTION = 7;
  const COMMENT = 8;

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
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
    const tag = span('pv-xml-tag', element.nodeName);
    if (element.namespaceURI) tag.title = element.namespaceURI;
    fragment.append(span('pv-xml-punct', '<'), tag);

    for (const attr of [...element.attributes]) {
      fragment.append(
        document.createTextNode(' '),
        span('pv-xml-attr-name', attr.name),
        span('pv-xml-punct', '='),
        span('pv-xml-attr-value', `"${attr.value}"`),
      );
    }

    fragment.append(span('pv-xml-punct', selfClosing ? '/>' : '>'));
    return fragment;
  }

  function closeTag(element) {
    const fragment = document.createDocumentFragment();
    fragment.append(
      span('pv-xml-punct', '</'),
      span('pv-xml-tag', element.nodeName),
      span('pv-xml-punct', '>'),
    );
    return fragment;
  }

  function renderEmptyElement(element) {
    const row = el('div', 'pv-xml-leaf');
    row.append(openTag(element, true));
    return row;
  }

  function renderTextOnlyElement(element, children) {
    const row = el('div', 'pv-xml-leaf');
    row.append(openTag(element));
    for (const child of children) {
      if (child.nodeType === CDATA) {
        row.append(span('pv-xml-cdata', `<![CDATA[${child.nodeValue}]]>`));
      } else {
        row.append(span('pv-xml-text', child.nodeValue.trim()));
      }
    }
    row.append(closeTag(element));
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
          : renderNonElement(child, ctx),
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
      span('pv-xml-count', `${children.length} nodes`),
    );
    details.append(summary, renderElementChildren(children, depth, ctx));

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
      return el('div', 'pv-tree-note', '…');
    }

    if (node.nodeType === TEXT) {
      ctx.text += 1;
      return el('div', 'pv-xml-text-block', node.nodeValue.trim());
    }

    if (node.nodeType === CDATA) {
      ctx.text += 1;
      return el(
        'div',
        'pv-xml-cdata-block',
        `<![CDATA[${node.nodeValue}]]>`,
      );
    }

    if (node.nodeType === COMMENT) {
      ctx.comments += 1;
      return el('div', 'pv-xml-comment', `<!--${node.nodeValue}-->`);
    }

    if (node.nodeType === PROCESSING_INSTRUCTION) {
      return el(
        'div',
        'pv-xml-pi',
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

    const tree = el('div', 'pv-xml');
    tree.append(renderElement(rootElement, 0, ctx, true));

    if (ctx.truncated) {
      tree.append(
        el(
          'div',
          'pv-tree-note',
          `Tree truncated at ${MAX_NODES.toLocaleString()} nodes. Use “Source” for the full file.`,
        ),
      );
    }

    return { element: tree, stats: ctx };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { renderXmlTree });
})(globalThis);
