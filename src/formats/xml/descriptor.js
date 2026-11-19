const ELEMENT_NODE = 1;
const ATTRIBUTE_NODE = 2;
const TEXT_NODE = 3;
const CDATA_NODE = 4;
const PROCESSING_INSTRUCTION_NODE = 7;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;

const NODE_TYPES = {
  [ELEMENT_NODE]: ELEMENT_NODE,
  [TEXT_NODE]: TEXT_NODE,
  [CDATA_NODE]: CDATA_NODE,
  [PROCESSING_INSTRUCTION_NODE]: PROCESSING_INSTRUCTION_NODE,
  [COMMENT_NODE]: COMMENT_NODE,
  [DOCUMENT_NODE]: DOCUMENT_NODE,
};

function descriptorNodeType(node) {
  return NODE_TYPES[node.nodeType] ?? node.nodeType;
}

function describeAttributes(node, descriptor, stats) {
  for (const attr of Array.from(node.attributes || [])) {
    descriptor.attributes.push({
      localName: attr.localName || attr.name,
      name: attr.name,
      namespaceURI: attr.namespaceURI || '',
      nodeName: attr.name,
      nodeType: ATTRIBUTE_NODE,
      nodeValue: attr.value,
      ownerElement: descriptor,
      prefix: attr.prefix || '',
      value: attr.value,
    });
    stats.attributes += 1;
  }
}

function buildNode(context, node, parent, depth) {
  const { byId, byNode, stats } = context;
  const descriptor = {
    attributes: [],
    childNodes: [],
    children: [],
    depth,
    id: context.nextId,
    localName: node.localName || node.nodeName || '',
    name: node.nodeName || '',
    namespaceURI: node.namespaceURI || '',
    nodeName: node.nodeName || '',
    nodeType: descriptorNodeType(node),
    nodeValue: node.nodeValue,
    ownerDocument: null,
    parentNode: parent,
    prefix: node.prefix || '',
    textContent: '',
  };
  context.nextId += 1;
  stats.nodes += 1;
  stats.depth = Math.max(stats.depth, depth);
  byId.set(descriptor.id, descriptor);
  byNode.set(node, descriptor);
  if (descriptor.nodeType === ELEMENT_NODE) {
    stats.elements += 1;
    describeAttributes(node, descriptor, stats);
  }

  for (const childSource of Array.from(node.childNodes || [])) {
    const child = buildNode(context, childSource, descriptor, depth + 1);
    descriptor.childNodes.push(child);
    if (child.nodeType === ELEMENT_NODE) {
      descriptor.children.push(child);
    }

    if (child.nodeType === TEXT_NODE || child.nodeType === CDATA_NODE) {
      stats.text += 1;
    } else if (child.nodeType === COMMENT_NODE) {
      stats.comments += 1;
    }
  }
  descriptor.textContent =
    descriptor.nodeType === ELEMENT_NODE
      ? descriptor.childNodes.map((child) => child.textContent).join('')
      : node.nodeValue || '';
  return descriptor;
}

function createDescriptorDocument(doc) {
  const context = {
    byId: new Map(),
    byNode: new Map(),
    nextId: 0,
    stats: { attributes: 0, comments: 0, depth: 0, elements: 0, nodes: 0, text: 0 },
  };
  if (!doc.documentElement) {
    return { ...context, documentElement: null };
  }
  const documentElement = buildNode(context, doc.documentElement, null, 0);
  documentElement.ownerDocument = { documentElement, nodeType: DOCUMENT_NODE };
  return { ...context, documentElement };
}

export { createDescriptorDocument };
