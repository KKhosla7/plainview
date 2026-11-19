import { createElement } from '../../core/dom.js';

const MAX_NODES = 40_000;
const ELEMENT = 1;
const TEXT = 3;
const CDATA = 4;
const PROCESSING_INSTRUCTION = 7;
const COMMENT = 8;

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

function xpathLiteral(value) {
  return `'${value}'`;
}

function ancestors(element) {
  const list = [];
  let node = element.parentNode;
  while (node && node.nodeType === ELEMENT) {
    list.push(node);
    node = node.parentNode;
  }

  return list;
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
  while (node && node.nodeType === ELEMENT) {
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
    if (node.nodeType === ELEMENT) {
      return true;
    }

    if (node.nodeType === TEXT) {
      return Boolean(node.nodeValue?.trim());
    }

    return [CDATA, COMMENT, PROCESSING_INSTRUCTION].includes(node.nodeType);
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

export {
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
};
