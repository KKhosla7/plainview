/*
 * Raw-document detection and source extraction. "Raw document" means the
 * browser is showing the file's own text, not an HTML rendering or an XSLT
 * output.
 */
export function isRawTextDocument() {
  if (document.querySelector('#webkit-xml-viewer-source-xml')) {
    return true;
  }

  if (!document.body) {
    return true; // Firefox raw XML
  }

  const pre = document.querySelector('body > pre');
  if (pre) {
    return true;
  }

  return document.body.children.length === 0 && Boolean(document.body.textContent?.trim());
}

export function extractSource(format) {
  const chromeXmlSource = document.querySelector('#webkit-xml-viewer-source-xml');
  if (format.id === 'xml' && chromeXmlSource) {
    return chromeXmlSource.innerHTML;
  }

  // Firefox renders XML documents without an HTML body. Serialize the DOM
  // back to text before replacing the document root.
  if (format.id === 'xml' && !document.body) {
    return new XMLSerializer().serializeToString(document);
  }

  const pre = document.querySelector('body > pre');
  if (pre) {
    return pre.textContent ?? '';
  }

  return document.body?.textContent ?? '';
}
