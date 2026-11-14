/* global MDView */
/*
 * Raw-document detection and source extraction. "Raw document" means the
 * browser is showing the file's own text, not an HTML rendering or an XSLT
 * output.
 */
(function (root) {
  'use strict';

  function isRawTextDocument() {
    if (document.getElementById('webkit-xml-viewer-source-xml')) return true;
    if (!document.body) return true; // Firefox raw XML

    const pre = document.querySelector('body > pre');
    if (pre) return true;

    return (
      document.body.children.length === 0 &&
      Boolean(document.body.textContent?.trim())
    );
  }

  function extractSource(format) {
    const chromeXmlSource = document.getElementById(
      'webkit-xml-viewer-source-xml',
    );
    if (format.id === 'xml' && chromeXmlSource) {
      return chromeXmlSource.innerHTML;
    }

    // Firefox renders XML documents without an HTML body. Serialize the DOM
    // back to text before replacing the document root.
    if (format.id === 'xml' && !document.body) {
      return new XMLSerializer().serializeToString(document);
    }

    const pre = document.querySelector('body > pre');
    if (pre) return pre.textContent ?? '';

    return document.body?.textContent ?? '';
  }

  /**
   * Firefox XML documents have no <body>, so turn the document into an XHTML
   * shell. Manifest CSS is not reliably applied to XML documents, so the CSS
   * is injected from the build-generated string.
   */
  function ensureHtmlShellForXml() {
    if (document.body) return;

    const NS = 'http://www.w3.org/1999/xhtml';
    const html = document.createElementNS(NS, 'html');
    const head = document.createElementNS(NS, 'head');
    const body = document.createElementNS(NS, 'body');
    const style = document.createElementNS(NS, 'style');
    style.textContent = root.MDVIEW_CSS || '';
    head.append(style);
    html.append(head, body);
    document.replaceChild(html, document.documentElement);
  }

  root.MDView = Object.assign(root.MDView || {}, {
    isRawTextDocument,
    extractSource,
    ensureHtmlShellForXml,
  });
})(globalThis);
