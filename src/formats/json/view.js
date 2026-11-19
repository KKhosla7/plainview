import { el } from '../../core/dom.js';
import { formatBytes, parseJson } from '../.././formats/json/parse.js';
import { createDataToolbar } from '../.././formats/shared/data-toolbar.js';
import { errorPanel } from '../.././formats/shared/error-panel.js';
import { createJsonTools } from './tools.js';
import { createJsonTree } from './tree.js';
import { createVirtualJsonTree } from './virtual-tree.js';

function summaryFor(source, options, stats) {
  return (
    `${stats.nodes.toLocaleString()}${stats.truncated ? '+' : ''} nodes · ` +
    `${formatBytes(source.length)}` +
    (options.suffix ? ` · ${options.suffix}` : '')
  );
}

function buildJsonValue(value, options = {}) {
  const treeMode = options.treeMode || document.documentElement.dataset.pvJsonTreeMode || 'virtual';
  const source = String(options.source ?? '');
  const article = el('article', 'pv-doc pv-data-doc');
  const indexRef = { current: new Map() };
  const exportState = {
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
  };
  const toolbar = createDataToolbar({
    article,
    source,
    summary: '',
    copyLabel: options.copyLabel || 'Copy JSON',
    treeMode,
  });
  const metaText = toolbar.querySelector('.pv-meta-text');
  const createTree = treeMode === 'classic' ? createJsonTree : createVirtualJsonTree;
  const { tree, context, revealPath } = createTree({
    value,
    source,
    options,
    indexRef,
    onStats(stats) {
      metaText.textContent = summaryFor(source, options, stats);
    },
  });
  const tools = createJsonTools({
    tree,
    rootValue: value,
    indexRef,
    revealPath,
    exportState,
  });
  article.append(toolbar, tools, tree);
  const formatId = options.exportFormatId || 'json';
  return {
    article,
    stats: context,
    error: false,
    tree,
    index: indexRef.current,
    exportData: {
      formatId,
      hasFilter: () => Boolean(exportState.values?.length),
      getDocument() {
        return {
          filter: exportState.filter,
          formatId,
          label: options.copyLabel?.replace(/^Copy /u, '') || 'JSON',
          source,
          suffix: options.suffix,
          value,
        };
      },
      getData(scope) {
        const data = scope === 'filtered' ? exportState.values : value;
        if (!data || (scope === 'filtered' && data.length === 0)) {
          return null;
        }

        return { data, formatId, kind: formatId };
      },
    },
  };
}

function buildJson(source) {
  const parsed = parseJson(source);
  if (parsed.error) {
    const article = el('article', 'pv-doc pv-data-doc');
    article.append(
      el('div', 'pv-doc-title', 'Invalid JSON'),
      errorPanel(parsed.error.message, parsed.error.line, parsed.error.column),
    );
    return { article, stats: null, error: true };
  }

  return buildJsonValue(parsed.value, {
    source,
    copyLabel: 'Copy JSON',
    exportFormatId: 'json',
    suffix: parsed.jsonc === true ? 'JSONC' : '',
  });
}

export { buildJson, buildJsonValue };
