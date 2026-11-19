import { el } from '../../core/dom.js';
import { openAncestors } from '../shared/tree-tools.js';

const COPY_RESET_MS = 1200;
const SEARCH_DEBOUNCE_MS = 120;
const ELEMENT_NODE = 1;
const ATTRIBUTE_NODE = 2;
const DOCUMENT_NODE = 9;
const TEXT_VALUE = 3;
const Text = TEXT_VALUE;
const CDATA_VALUE = 4;
const Cdata = CDATA_VALUE;

function button(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

function searchText(node) {
  if (node.nodeType === ELEMENT_NODE) {
    const attrs = [...node.attributes].map((attr) => `${attr.name}=${attr.value}`).join(' ');
    return `${node.nodeName} ${attrs}`;
  }

  if (node.nodeType === ATTRIBUTE_NODE) {
    return `${node.name}=${node.value}`;
  }

  return node.nodeValue || '';
}

function exportNode(node) {
  if (node.nodeType === ATTRIBUTE_NODE) {
    return node.ownerELEMENT_NODE;
  }

  if (node.nodeType === Text || node.nodeType === Cdata) {
    return node.parentELEMENT_NODE;
  }

  return node.nodeType === DOCUMENT_NODE ? node.documentELEMENT_NODE : node;
}

function mark(entry, className) {
  if (entry.virtual) {
    entry.virtual.mark(className);
    return;
  }
  entry.node.classList.add(className);
  if (entry.summary) {
    entry.summary.classList.add(className);
  }
}

function unmark(entry, className) {
  if (entry.virtual) {
    entry.virtual.unmark(className);
    return;
  }
  entry.node.classList.remove(className);
  if (entry.summary) {
    entry.summary.classList.remove(className);
  }
}

function reveal(entry) {
  if (entry.virtual) {
    entry.virtual.reveal();
    return;
  }
  openAncestors(entry);
  requestAnimationFrame(() => {
    entry.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function selectHit(hits, nextIndex, activeClass) {
  for (const hit of hits) {
    unmark(hit, activeClass);
  }

  if (hits.length === 0) {
    return -1;
  }
  const wrapped = (nextIndex + hits.length) % hits.length;
  const entry = hits[wrapped];
  mark(entry, activeClass);
  reveal(entry);
  return wrapped;
}

export const xmlToolsShared = {
  COPY_RESET_MS,
  SEARCH_DEBOUNCE_MS,
  ATTRIBUTE_NODE,
  DOCUMENT_NODE,
  button,
  exportNode,
  el,
  mark,
  searchText,
  selectHit,
  unmark,
};
