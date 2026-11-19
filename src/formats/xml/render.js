import { createElement } from '../.././core/dom.js';

/* global Plainview */
((root) => {
  const MaxNodes = 40_000;
  const Element = 1;
  const Text = 3;
  const Cdata = 4;
  const ProcessingInstruction = 7;
  const Comment = 8;

  function el(tag, className, text) {
    const node = createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function register(ctx, sourceNode, rendered, summary = null) {
    ctx.byNode.set(sourceNode, { node: rendered, source: sourceNode, summary });
  }

  function xpathLiteral(value) {
    return `'${value}'`;
  }

  function sameElementSiblings(current) {
    if (!current.parentNode) {
      return [current];
    }

    return [...current.parentNode.children].filter(
      (sibling) =>
        sibling.localName === current.localName && sibling.namespaceURI === current.namespaceURI,
    );
  }

  function xpathFor(element, rootElement) {
    const useLocalName = [element, ...ancestors(element)].some(
      (ancestor) => ancestor.namespaceURI || ancestor.prefix,
    );
    const segments = [];
    let node = element;
    while (node && node.nodeType === Element) {
      const siblings = sameElementSiblings(node);
      const index = siblings.indexOf(node) + 1;
      const name = useLocalName ? `*[local-name()=${xpathLiteral(node.localName)}]` : node.nodeName;
      segments.unshift(node === rootElement ? name : `${name}[${index}]`);
      if (node === rootElement) {
        break;
      }
      node = node.parentNode;
    }

    return `/${segments.join('/')}`;
  }

  function ancestors(element) {
    const list = [];
    let node = element.parentNode;
    while (node && node.nodeType === Element) {
      list.push(node);
      node = node.parentNode;
    }

    return list;
  }

  function pathButton(element, rootElement) {
    const path = xpathFor(element, rootElement);
    const node = el('button', 'pv-json-path pv-xml-path', '⧉');
    node.type = 'button';
    node.title = `Copy XPath ${path}`;
    node.setAttribute('aria-label', `Copy XPath ${path}`);
    node.setAttribute('data-xpath', path);
    return node;
  }

  function meaningfulChildren(element) {
    return [...element.childNodes].filter((node) => {
      if (node.nodeType === Element) {
        return true;
      }

      if (node.nodeType === Text) {
        return Boolean(node.nodeValue?.trim());
      }

      return [Cdata, Comment, ProcessingInstruction].includes(node.nodeType);
    });
  }

  function openTag(element, selfClosing = false) {
    const fragment = document.createDocumentFragment();
    const tag = el('span', 'pv-xml-tag', element.nodeName);
    if (element.namespaceURI) {
      tag.title = element.namespaceURI;
    }
    fragment.append(el('span', 'pv-xml-punct', '<'), tag);

    for (const attr of element.attributes) {
      fragment.append(
        document.createTextNode(' '),
        el('span', 'pv-xml-attr-name', attr.name),
        el('span', 'pv-xml-punct', '='),
        el('span', 'pv-xml-attr-value', `"${attr.value}"`),
      );
    }

    fragment.append(el('span', 'pv-xml-punct', selfClosing ? '/>' : '>'));
    return fragment;
  }

  function closeTag(element) {
    const fragment = document.createDocumentFragment();
    fragment.append(
      el('span', 'pv-xml-punct', '</'),
      el('span', 'pv-xml-tag', element.nodeName),
      el('span', 'pv-xml-punct', '>'),
    );
    return fragment;
  }

  function renderEmptyElement(element, ctx) {
    const row = el('div', 'pv-xml-leaf');
    row.append(openTag(element, true), pathButton(element, ctx.rootElement));
    register(ctx, element, row);
    return row;
  }

  function renderTextOnlyElement(element, children, ctx) {
    const row = el('div', 'pv-xml-leaf');
    row.append(openTag(element));
    for (const child of children) {
      if (child.nodeType === Cdata) {
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
      if (ctx.nodes > MaxNodes) {
        ctx.truncated = true;
        body.append(el('div', 'pv-tree-note', '…'));
        break;
      }
      body.append(
        child.nodeType === Element
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

    if (ctx.nodes > MaxNodes) {
      ctx.truncated = true;
      return el('div', 'pv-tree-note', '…');
    }

    const children = meaningfulChildren(element);
    if (children.length === 0) {
      return renderEmptyElement(element, ctx);
    }

    const textOnly = children.every((node) => node.nodeType === Text || node.nodeType === Cdata);
    if (textOnly) {
      return renderTextOnlyElement(element, children, ctx);
    }

    return renderElementContainer(element, children, depth, ctx, isRoot);
  }

  function renderNonElement(node, ctx) {
    ctx.nodes += 1;
    if (ctx.nodes > MaxNodes) {
      ctx.truncated = true;
      return el('div', 'pv-tree-note', '…');
    }

    if (node.nodeType === Text) {
      ctx.text += 1;
      const row = el('div', 'pv-xml-text-block', node.nodeValue.trim());
      register(ctx, node, row);
      return row;
    }

    if (node.nodeType === Cdata) {
      ctx.text += 1;
      const row = el('div', 'pv-xml-cdata-block', `<![CDATA[${node.nodeValue}]]>`);
      register(ctx, node, row);
      return row;
    }

    if (node.nodeType === Comment) {
      ctx.comments += 1;
      const row = el('div', 'pv-xml-comment', `<!--${node.nodeValue}-->`);
      register(ctx, node, row);
      return row;
    }

    if (node.nodeType === ProcessingInstruction) {
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
      const note = `Tree truncated at ${MaxNodes.toLocaleString()} nodes. Use “Source” for the full file.`;
      tree.append(el('div', 'pv-tree-note', note));
    }

    return { element: tree, stats: ctx, byNode: ctx.byNode };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    renderXmlTree,
    xmlTreeShared: {
      Cdata,
      Comment,
      Element,
      MaxNodes,
      ProcessingInstruction,
      Text,
      closeTag,
      meaningfulChildren,
      openTag,
      pathButton,
    },
  });
})(globalThis);
