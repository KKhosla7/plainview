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
    const toolbar = Plainview.createDataToolbar({
      article,
      source,
      summary: '',
      copyLabel: options.copyLabel || 'Copy JSON',
    });
    const metaText = toolbar.querySelector('.pv-meta-text');
    const { tree, context, revealPath } = Plainview.createJsonTree({
      value,
      source,
      options,
      indexRef,
      onStats(stats) {
        metaText.textContent = summaryFor(source, options, stats);
      },
    });
    const tools = Plainview.createJsonTools({ tree, rootValue: value, indexRef, revealPath });
    article.append(toolbar, tools, tree);
    return { article, stats: context, error: false, tree, index: indexRef.current };
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
      suffix: parsed.jsonc ? 'JSONC' : '',
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildJson, buildJsonValue });
})(globalThis);
