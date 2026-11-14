/* global Plainview */
/*
 * XML documents may have no HTML body or a privileged native viewer. Elements
 * created with document.createElement() there may not behave like HTML, so use
 * a hidden HTML document as the element factory for every XML document.
 */
(function (root) {
  'use strict';

  const isXmlDocument = /xml/i.test(document.contentType || '');
  const factory = isXmlDocument
    ? document.implementation.createHTMLDocument('')
    : document;

  function createElement(tag) {
    return factory.createElement(tag);
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createElement });
})(globalThis);
