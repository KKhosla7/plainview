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

  function treeModeFor(options, virtual) {
    if (options.standalone) {
      return '';
    }

    return virtual ? 'virtual' : 'classic';
  }

  function buildJsonValue(value, options = {}) {
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
    const virtual = document.documentElement.dataset.pvJsonTreeMode === 'virtual';
    const toolbar = Plainview.createDataToolbar({
      article,
      source,
      summary: '',
      copyLabel: options.copyLabel || 'Copy JSON',
      treeMode: treeModeFor(options, virtual),
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

  function buildJsonl(source) {
    const parsed = Plainview.parseJsonl(source);
    if (parsed.error) {
      const article = el('article', 'pv-doc pv-data-doc');
      article.append(
        el('div', 'pv-doc-title', 'Invalid JSONL'),
        Plainview.errorPanel(parsed.error.message, parsed.error.line, parsed.error.column),
      );
      return { article, stats: null, error: true };
    }

    return buildJsonValue(parsed.values, {
      source,
      copyLabel: 'Copy JSONL',
      exportFormatId: 'jsonl',
      suffix: 'JSONL',
    });
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

  root.Plainview = Object.assign(root.Plainview || {}, {
    buildJson,
    buildJsonValue,
    buildJsonl,
  });
})(globalThis);
