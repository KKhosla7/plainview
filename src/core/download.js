import { createElement } from '../core/dom.js';

const REVOKE_DELAY_MS = 10_000;

const Mime = {
  markdown: 'text/markdown;charset=utf-8',
  json: 'application/json;charset=utf-8',
  xml: 'application/xml;charset=utf-8',
};

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = createElement('a');
  link.href = url;
  link.download = fileName || 'document.txt';
  link.dataset.pvDownload = 'ignore';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

function downloadText(source, fileName, format) {
  const type = Mime[format.id] || 'text/plain;charset=utf-8';
  downloadBlob(
    new Blob([source], { type }),
    fileName || `document.${format.extensions?.[0] || 'txt'}`,
  );
}

function downloadHtml(html, fileName) {
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName || 'document.html');
}

export { downloadBlob, downloadHtml, downloadText };
