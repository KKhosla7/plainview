import { el } from '../core/dom.js';

export function buildLogs(source) {
  const article = el('article', 'pv-doc pv-data-doc pv-jsonl-doc');
  const pre = el('pre', 'pv-jsonl-record', String(source ?? ''));
  article.append(pre);
  return { article, stats: { rows: 0 }, error: false };
}
