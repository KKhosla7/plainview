/* global MDView */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function metaButton(label) {
    const button = el('button', 'mdv-meta-button', label);
    button.type = 'button';
    return button;
  }

  function createDataToolbar({ article, source, summary, copyLabel }) {
    const meta = el('div', 'mdv-doc-meta');
    const text = el('span', 'mdv-meta-text', summary);
    const actions = el('span', 'mdv-meta-actions');

    const expand = metaButton('Expand all');
    expand.addEventListener('click', () => {
      for (const details of article.querySelectorAll('details')) {
        details.open = true;
      }
    });

    const collapse = metaButton('Collapse all');
    collapse.addEventListener('click', () => {
      for (const details of article.querySelectorAll('details')) {
        details.open = false;
      }
    });

    const copy = metaButton(copyLabel);
    copy.addEventListener('click', async () => {
      const ok = await MDView.copyText(source);
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(() => {
        copy.textContent = copyLabel;
      }, 1200);
    });

    actions.append(expand, collapse, copy);
    meta.append(text, actions);
    return meta;
  }

  root.MDView = Object.assign(root.MDView || {}, { createDataToolbar });
})(globalThis);
