import { el } from '.././core/dom.js';

/* global Plainview */
((root) => {
  function buildLogs(source) {
    const article = el('article', 'pv-doc pv-data-doc pv-jsonl-doc');
    const pre = el('pre', 'pv-jsonl-record', String(source ?? ''));
    article.append(pre);
    return { article, stats: { rows: 0 }, error: false };
  }
  root.Plainview = Object.assign(root.Plainview || {}, { buildLogs });
})(globalThis);
