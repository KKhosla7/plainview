/* global MDView */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function errorPanel(message, line, column) {
    const panel = el('div', 'mdv-error');
    panel.append(el('strong', '', 'Could not parse this document.'));
    panel.append(el('div', 'mdv-error-message', message));
    if (line) {
      panel.append(
        el(
          'div',
          'mdv-error-location',
          `Line ${line}${column ? `, column ${column}` : ''}`,
        ),
      );
    }
    return panel;
  }

  root.MDView = Object.assign(root.MDView || {}, { errorPanel });
})(globalThis);
