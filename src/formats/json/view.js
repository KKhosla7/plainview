/* global Plainview */
/*
 * JSON/JSONC document entry point. Tree construction lives in tree.js.
 */
((root) => {
  const { el } = Plainview;

  function summaryFor(source, options, stats) {
    return (
      `${stats.nodes.toLocaleString()}${stats.truncated ? '+' : ''} nodes · ` +
      `${Plainview.formatBytes(source.length)}` +
      (options.suffix ? ` · ${options.suffix}` : '')
    );
  }

  function buildJsonValue(value, options = {}) {
    const source = String(options.source ?? '');
    const article = el('article', 'pv-doc pv-data-doc');
    const indexRef = { current: new Map() };
    const exportState = {
      kind: '',
      values: null,
      set(kind, values) {
        this.kind = kind;
        this.values = values;
      },
      clear(kind) {
        if (this.kind === kind) {
          this.kind = '';
          this.values = null;
        }
      },
      getFiltered() {
        return this.values;
      },
    };
    const virtual = document.documentElement.dataset.pvJsonTreeMode === 'virtual';
    const toolbar = Plainview.createDataToolbar({
      article,
      source,
      summary: '',
      copyLabel: options.copyLabel || 'Copy JSON',
      treeMode: virtual ? 'virtual' : 'classic',
    });
    const metaText = toolbar.querySelector('.pv-meta-text');
    const factory = virtual ? Plainview.createVirtualJsonTree : Plainview.createJsonTree;
    const { tree, context, revealPath } = factory({
      value,
      source,
      options,
      indexRef,
      onStats(stats) {
        metaText.textContent = summaryFor(source, options, stats);
      },
    });
    const tools = Plainview.createJsonTools({
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
        hasFilter: () => Boolean(exportState.getFiltered()?.length),
        getData(scope) {
          const data = scope === 'filtered' ? exportState.getFiltered() : value;
          if (!data || (scope === 'filtered' && data.length === 0)) {
            return null;
          }

          return { data, formatId, kind: formatId };
        },
      },
    };
  }

  function buildJson(source) {
    const parsed = Plainview.parseJson(source);
    if (parsed.error) {
      const article = el('article', 'pv-doc pv-data-doc');
      article.append(
        el('div', 'pv-doc-title', 'Invalid JSON'),
        Plainview.errorPanel(parsed.error.message, parsed.error.line, parsed.error.column),
      );
      return { article, stats: null, error: true };
    }

    return buildJsonValue(parsed.value, {
      source,
      copyLabel: 'Copy JSON',
      exportFormatId: 'json',
      suffix: parsed.jsonc ? 'JSONC' : '',
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildJson, buildJsonValue });
})(globalThis);
