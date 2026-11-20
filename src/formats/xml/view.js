import { createElement } from '../../core/dom.js';
import { formatBytes } from '../.././formats/json/parse.js';
import { createDataToolbar } from '../.././formats/shared/data-toolbar.js';
import { errorPanel } from '../.././formats/shared/error-panel.js';
import { createDescriptorDocument, hydrateDescriptorDocument } from './descriptor.js';
import { parseXml } from './parse.js';
import { renderXmlTree } from './render.js';
import { createXmlTools } from './tools.js';
import { createXmlVirtualTree } from './virtual-tree.js';
import { createXmlWorkerClient } from './worker-client.js';

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

function selectTree(rootElement) {
  return document.documentElement.dataset.pvJsonTreeMode === 'classic'
    ? renderXmlTree(rootElement)
    : createXmlVirtualTree(rootElement);
}

function createXmlExportData(source, exportState) {
  return {
    formatId: 'xml',
    hasFilter: () => Boolean(exportState.getFiltered()?.length),
    getDocument() {
      return { filter: exportState.filter, formatId: 'xml', source };
    },
    getData(scope) {
      const nodes = exportState.getFiltered();
      if (scope === 'filtered') {
        return nodes?.length ? { data: nodes, formatId: 'xml', kind: 'xml-nodes' } : null;
      }

      return { data: source, formatId: 'xml', kind: 'xml' };
    },
  };
}

function createXmlExportState() {
  return {
    filter: null,
    kind: '',
    values: null,
    set(kind, values, filter = null) {
      this.kind = kind;
      this.values = values;
      this.filter = filter;
    },
    clear(kind) {
      if (this.kind === kind) {
        this.filter = null;
        this.kind = '';
        this.values = null;
      }
    },
    getFiltered() {
      return this.values;
    },
  };
}

function runtimeApi() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime ?? null;
}

function parseFallback(source) {
  const parsed = parseXml(source);
  const parseError = Object.getOwnPropertyDescriptor(parsed, 'error')?.value;
  if (parseError) {
    return { error: parseError, xpath: null };
  }
  const document = hydrateDescriptorDocument(createDescriptorDocument(parsed.doc));
  return { document, nativeByNode: document.byNode, xpath: null };
}

async function parseXmlDocument(source) {
  const runtime = runtimeApi();
  if (!runtime?.getURL) {
    return parseFallback(source);
  }

  let client;
  try {
    client = createXmlWorkerClient(runtime, source);
    const result = await client.parse();
    if (!result) {
      return parseFallback(source);
    }

    if (!result.ok) {
      return { error: result.error, xpath: client.xpath };
    }

    return {
      document: hydrateDescriptorDocument(result.document),
      xpath: client.xpath,
    };
  } catch {
    return parseFallback(source);
  }
}

async function buildXml(source) {
  const parsed = await parseXmlDocument(source);
  const parseError = Object.getOwnPropertyDescriptor(parsed, 'error')?.value;
  const article = el('article', 'pv-doc pv-data-doc');

  if (parseError) {
    article.append(
      el('div', 'pv-doc-title', 'Invalid XML'),
      errorPanel(parseError.message, parseError.line, parseError.column),
    );
    return { article, stats: null, error: true };
  }

  const treeMode = document.documentElement.dataset.pvJsonTreeMode || 'virtual';
  const tree = selectTree(parsed.document.documentElement);
  const { stats } = tree;
  const exportState = createXmlExportState();

  article.append(
    createDataToolbar({
      article,
      source,
      summary:
        `${stats.elements.toLocaleString()} elements · ` +
        `${stats.attributes.toLocaleString()} attributes · ` +
        formatBytes(source.length),
      copyLabel: 'Copy XML',
      treeMode,
    }),
    createXmlTools({
      tree: tree.element,
      byId: tree.byId,
      byNode: tree.byNode,
      nativeByNode: parsed.nativeByNode,
      xpath: parsed.xpath,
      exportState,
    }),
    tree.element,
  );

  return {
    article,
    stats,
    error: false,
    exportData: createXmlExportData(source, exportState),
  };
}

export { buildXml };
