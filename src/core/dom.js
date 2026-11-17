/* global Plainview */
/*
 * XML documents may have no HTML body or a privileged native viewer. Elements
 * created with document.createElement() there may not behave like HTML, so use
 * a hidden HTML document as the element factory for every XML document.
 */
((root) => {
  const isXmlDocument = /xml/iu.test(document.contentType || '');
  const factory = isXmlDocument ? document.implementation.createHTMLDocument('') : document;

  function createElement(tag) {
    return factory.createElement(tag);
  }

  function el(tag, className, text) {
    const node = createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function replaceWithGeneratedHtml(element, html) {
    const parsed = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    element.replaceChildren(...parsed.body.childNodes);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createElement,
    el,
    replaceWithGeneratedHtml,
  });
})(globalThis);
