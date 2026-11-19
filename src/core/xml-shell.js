export function ensureHtmlShellForXml() {
  const XhtmlNamespace = 'http://www.w3.org/1999/xhtml';

  if (!document.body) {
    const html = document.createElementNS(XhtmlNamespace, 'html');
    const head = document.createElementNS(XhtmlNamespace, 'head');
    const body = document.createElementNS(XhtmlNamespace, 'body');
    const style = document.createElementNS(XhtmlNamespace, 'style');

    style.setAttribute('data-pv-style', '');
    style.textContent = globalThis.PLAINVIEW_CSS || '';
    head.append(style);
    html.append(head, body);
    document.replaceChild(html, document.documentElement);
    return;
  }

  if (document.querySelector('style[data-pv-style]')) {
    return;
  }

  const style = document.createElementNS(XhtmlNamespace, 'style');
  style.setAttribute('data-pv-style', '');
  style.textContent = globalThis.PLAINVIEW_CSS || '';
  (document.head || document.documentElement).append(style);
}
