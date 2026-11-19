import { createElement } from '../../core/dom.js';

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

function errorPanel(message, line, column) {
  const panel = el('div', 'pv-error');
  panel.append(el('strong', '', 'Could not parse this document.'));
  panel.append(el('div', 'pv-error-message', message));
  if (line) {
    panel.append(
      el('div', 'pv-error-location', `Line ${line}${column ? `, column ${column}` : ''}`),
    );
  }

  return panel;
}

export { errorPanel };
