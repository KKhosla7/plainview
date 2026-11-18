/* global Plainview */
((root) => {
  function buildLogs(source) {
    const article = Plainview.el('article', 'pv-doc pv-data-doc pv-jsonl-doc');
    const pre = Plainview.el('pre', 'pv-jsonl-record', String(source ?? ''));
    article.append(pre);
    return { article, stats: { rows: 0 }, error: false };
  }
  root.Plainview = Object.assign(root.Plainview || {}, { buildLogs });
})(globalThis);
