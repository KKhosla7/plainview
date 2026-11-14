/* global MDView */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildXml(source) {
    const parsed = MDView.parseXml(source);
    const article = el('article', 'mdv-doc mdv-data-doc');

    if (parsed.error) {
      article.append(
        el('div', 'mdv-doc-title', 'Invalid XML'),
        MDView.errorPanel(
          parsed.error.message,
          parsed.error.line,
          parsed.error.column,
        ),
      );
      return { article, stats: null, error: true };
    }

    const tree = MDView.renderXmlTree(parsed.doc.documentElement);
    const { stats } = tree;

    article.append(
      MDView.createDataToolbar({
        article,
        source,
        summary:
          `${stats.elements.toLocaleString()} elements · ` +
          `${stats.attributes.toLocaleString()} attributes · ` +
          MDView.formatBytes(source.length),
        copyLabel: 'Copy XML',
      }),
      tree.element,
    );

    return { article, stats, error: false };
  }

  root.MDView = Object.assign(root.MDView || {}, { buildXml });
})(globalThis);
