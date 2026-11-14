/* global MDView */
/*
 * Purely visual: put the document's own H1 and first paragraph in a bordered
 * title box. No invented metadata is added.
 */
(function (root) {
  'use strict';

  function applyTitleBlock(article) {
    const first = article.firstElementChild;
    if (!first || first.tagName !== 'H1') return;

    const lede =
      first.nextElementSibling?.tagName === 'P'
        ? first.nextElementSibling
        : null;

    const block = MDView.createElement('header');
    block.className = 'mdv-titleblock';

    const main = MDView.createElement('div');
    main.className = 'mdv-tb-main';

    first.querySelector('.mdv-anchor')?.remove();
    first.classList.add('mdv-tb-title');
    main.append(first);

    if (lede) {
      lede.classList.add('mdv-tb-lede');
      main.append(lede);
    }

    block.append(main);
    article.prepend(block);
  }

  root.MDView = Object.assign(root.MDView || {}, { applyTitleBlock });
})(globalThis);
