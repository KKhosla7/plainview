/* global Plainview */
/*
 * XML documents are inconsistent across browsers: Firefox may have no body,
 * while Chromium has a native XML viewer with its own document. Inject the
 * build-generated stylesheet for both, and create an XHTML shell when needed.
 */
(function (root) {
  'use strict';

  function ensureHtmlShellForXml() {
    const NS = 'http://www.w3.org/1999/xhtml';

    if (!document.body) {
      const html = document.createElementNS(NS, 'html');
      const head = document.createElementNS(NS, 'head');
      const body = document.createElementNS(NS, 'body');
      const style = document.createElementNS(NS, 'style');

      style.setAttribute('data-pv-style', '');
      style.textContent = root.PLAINVIEW_CSS || '';
      head.append(style);
      html.append(head, body);
      document.replaceChild(html, document.documentElement);
      return;
    }

    if (document.querySelector('style[data-pv-style]')) return;

    const style = document.createElementNS(NS, 'style');
    style.setAttribute('data-pv-style', '');
    style.textContent = root.PLAINVIEW_CSS || '';
    (document.head || document.documentElement).append(style);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    ensureHtmlShellForXml,
  });
})(globalThis);
