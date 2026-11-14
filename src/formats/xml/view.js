/* global Plainview */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildXml(source) {
    const parsed = Plainview.parseXml(source);
    const article = el('article', 'pv-doc pv-data-doc');

    if (parsed.error) {
      article.append(
        el('div', 'pv-doc-title', 'Invalid XML'),
        Plainview.errorPanel(
          parsed.error.message,
          parsed.error.line,
          parsed.error.column,
        ),
      );
      return { article, stats: null, error: true };
    }

    const tree = Plainview.renderXmlTree(parsed.doc.documentElement);
    const { stats } = tree;

    article.append(
      Plainview.createDataToolbar({
        article,
        source,
        summary:
          `${stats.elements.toLocaleString()} elements · ` +
          `${stats.attributes.toLocaleString()} attributes · ` +
          Plainview.formatBytes(source.length),
        copyLabel: 'Copy XML',
      }),
      tree.element,
    );

    return { article, stats, error: false };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildXml });
})(globalThis);
