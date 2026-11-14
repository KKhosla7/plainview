/* global MDView */
/*
 * Raw XML documents (Firefox, and Chrome's malformed-XML page) have no HTML
 * body. Elements created with document.createElement() there are not HTML
 * elements, so buttons/details stop behaving like HTML. Use a hidden HTML
 * document as the element factory for those cases.
 */
(function (root) {
  'use strict';

  const isXmlDocument =
    /xml/i.test(document.contentType || '') && !document.body;
  const factory = isXmlDocument
    ? document.implementation.createHTMLDocument('')
    : document;

  function createElement(tag) {
    return factory.createElement(tag);
  }

  root.MDView = Object.assign(root.MDView || {}, {
    createElement,
    isXmlDocument,
  });
})(globalThis);
