import { el } from '../../core/dom.js';
import { jsonToolsShared } from '../.././formats/json/tools-shared.js';
import {
  CDATA,
  COMMENT,
  ELEMENT,
  MAX_NODES,
  meaningfulChildren,
  PROCESSING_INSTRUCTION,
  TEXT,
} from './tree-shared.js';
import { createRow } from './virtual-rows.js';

const ROW_HEIGHT_VALUE = 24;
const RowHeight = ROW_HEIGHT_VALUE;
const OVERSCAN_VALUE = 8;
const Overscan = OVERSCAN_VALUE;

function createStats() {
  return {
    attributes: 0,
    comments: 0,
    depth: 0,
    elements: 0,
    nodes: 0,
    text: 0,
    truncated: false,
  };
}

function ensureChildren(state, descriptor) {
  if (descriptor.childrenLoaded) {
    return;
  }

  descriptor.childrenLoaded = true;
  for (const child of meaningfulChildren(descriptor.source)) {
    const described = describeNode(state, child, descriptor.depth + 1, descriptor);
    if (described) {
      descriptor.children.push(described);
    }
  }
}

function describeELEMENT(state, descriptor, source, depth) {
  state.stats.elements += 1;
  state.stats.attributes += source.attributes.length;
  const children = meaningfulChildren(source);
  descriptor.childCount = children.length;
  if (children.length === 0) {
    descriptor.kind = 'empty';
    descriptor.childrenLoaded = true;
  } else if (children.every((child) => child.nodeType === TEXT || child.nodeType === CDATA)) {
    descriptor.kind = 'text';
    descriptor.childrenLoaded = true;
    descriptor.textChildren = children;
    state.stats.text += children.length;
    for (const child of children) {
      state.byNode.set(child, descriptor);
    }
  } else {
    descriptor.kind = 'container';
    descriptor.expanded = depth < 2;
    descriptor.childrenLoaded = false;
  }
}

function describeOther(state, descriptor, source) {
  if (source.nodeType === TEXT) {
    descriptor.kind = 'textNode';
    state.stats.text += 1;
  } else if (source.nodeType === CDATA) {
    descriptor.kind = 'cdata';
    state.stats.text += 1;
  } else if (source.nodeType === COMMENT) {
    descriptor.kind = 'comment';
    state.stats.comments += 1;
  } else if (source.nodeType === PROCESSING_INSTRUCTION) {
    descriptor.kind = 'pi';
  }
}

function describeNode(state, source, depth, parent) {
  if (state.stats.nodes >= MAX_NODES) {
    state.stats.truncated = true;
    return null;
  }

  const descriptor = {
    children: [],
    classes: new Set(),
    depth,
    expanded: false,
    kind: 'other',
    parent,
    row: null,
    source,
    textChildren: [],
    virtual: null,
  };
  state.stats.nodes += 1;
  state.stats.depth = Math.max(state.stats.depth, depth);
  if (source.nodeType === ELEMENT) {
    describeELEMENT(state, descriptor, source, depth);
  } else {
    describeOther(state, descriptor, source);
  }
  state.byNode.set(source, descriptor);
  if (source.id !== undefined) {
    state.byId.set(source.id, descriptor);
  }

  return attachVirtual(state, descriptor);
}

function describeAll(state, descriptor) {
  if (descriptor.kind !== 'container') {
    return;
  }

  ensureChildren(state, descriptor);
  for (const child of descriptor.children) {
    describeAll(state, child);
  }
}

function attachVirtual(state, descriptor) {
  descriptor.virtual = {
    mark(className) {
      descriptor.classes.add(className);
      descriptor.row?.classList.add(className);
    },
    reveal() {
      revealDescriptor(state, descriptor);
    },
    unmark(className) {
      descriptor.classes.delete(className);
      descriptor.row?.classList.remove(className);
    },
  };
  return descriptor;
}

function collect(state) {
  state.rows = [];
  function walk(descriptor) {
    state.rows.push(descriptor);
    if (descriptor.kind === 'container' && descriptor.expanded) {
      ensureChildren(state, descriptor);
      for (const child of descriptor.children) {
        walk(child);
      }
    }
  }

  walk(state.root);
  state.tree.style.height = `${state.rows.length * RowHeight}px`;
}

function rebuild(state) {
  collect(state);
  state.rowELEMENTs = new Map();
  state.tree.replaceChildren();
  renderRows(state);
}

function renderRows(state) {
  const rect = state.tree.getBoundingClientRect();
  const top = Math.max(0, -rect.top);
  const bottom = Math.min(rect.height, globalThis.innerHeight - rect.top);
  const start = Math.max(0, Math.floor(top / RowHeight) - Overscan);
  const end = Math.min(state.rows.length, Math.ceil(bottom / RowHeight) + Overscan);
  for (const [index, row] of state.rowELEMENTs) {
    if (index < start || index >= end) {
      state.rows[index].row = null;
      row.remove();
      state.rowELEMENTs.delete(index);
    }
  }

  const fragment = document.createDocumentFragment();
  for (let index = start; index < end; index += 1) {
    if (state.rowELEMENTs.has(index)) {
      continue;
    }
    const row = createRow(state, state.rows[index], index);
    state.rowELEMENTs.set(index, row);
    fragment.append(row);
  }

  if (fragment.childNodes.length > 0) {
    state.tree.append(fragment);
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

function expandAncestors(descriptor) {
  let node = descriptor.parent;
  while (node) {
    node.expanded = true;
    node = node.parent;
  }
}

function revealDescriptor(state, descriptor) {
  expandAncestors(descriptor);
  rebuild(state);
  const index = state.rows.indexOf(descriptor);
  if (index < 0) {
    return;
  }
  const offset = jsonToolsShared.stickyOffset();
  const top =
    globalThis.scrollY + state.tree.getBoundingClientRect().top + index * RowHeight - offset;
  globalThis.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  scheduleRender(state);
}

function expandAll(state, descriptor) {
  if (descriptor.kind !== 'container') {
    return;
  }
  descriptor.expanded = true;
  ensureChildren(state, descriptor);
  for (const child of descriptor.children) {
    expandAll(state, child);
  }
}

function collapseAll(descriptor) {
  if (descriptor.kind !== 'container') {
    return;
  }
  descriptor.expanded = false;
  for (const child of descriptor.children) {
    collapseAll(child);
  }
}

function createXmlVirtualTree(rootElement) {
  const tree = el('div', 'pv-xml pv-virtual-tree pv-xml-virtual');
  const state = {
    byId: new Map(),
    byNode: new Map(),
    frame: 0,
    rootElement,
    rows: [],
    rowELEMENTs: new Map(),
    stats: createStats(),
    tree,
  };
  state.rebuild = () => rebuild(state);
  state.root = describeNode(state, rootElement, 0, null);
  state.byNode.ensureAll = () => describeAll(state, state.root);
  collect(state);
  renderRows(state);
  tree.addEventListener('pv-expand-all', () => {
    expandAll(state, state.root);
    rebuild(state);
  });
  tree.addEventListener('pv-collapse-all', () => {
    collapseAll(state.root);
    rebuild(state);
  });
  const observer = new globalThis.ResizeObserver(() => scheduleRender(state));
  observer.observe(tree);
  globalThis.requestAnimationFrame(() => scheduleRender(state));
  globalThis.addEventListener('scroll', () => scheduleRender(state), { passive: true });
  globalThis.addEventListener('resize', () => scheduleRender(state));
  return { element: tree, stats: state.stats, byId: state.byId, byNode: state.byNode };
}

export { createXmlVirtualTree };
