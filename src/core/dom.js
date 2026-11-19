const isXmlDocument = /xml/iu.test(document.contentType || '');
const factory = isXmlDocument ? document.implementation.createHTMLDocument('') : document;

export function createElement(tag) {
  return factory.createElement(tag);
}

export function el(tag, className, text) {
  const node = createElement(tag);
  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

export function replaceWithGeneratedHtml(element, html) {
  const parsed = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  element.replaceChildren(...parsed.body.childNodes);
}
