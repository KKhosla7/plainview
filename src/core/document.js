export function isRawTextDocument() {
  if (document.querySelector('#webkit-xml-viewer-source-xml')) {
    return true;
  }

  if (!document.body) {
    return true;
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

  if (format.id === 'xml' && !document.body) {
    return new XMLSerializer().serializeToString(document);
  }

  const pre = document.querySelector('body > pre');
  if (pre) {
    return pre.textContent ?? '';
  }

  return document.body?.textContent ?? '';
}
