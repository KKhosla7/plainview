import { createElement } from '../../core/dom.js';

/* global Plainview */
/*
 * Purely visual: put the document's own H1 and first paragraph in a bordered
 * title box. No invented metadata is added.
 */
((root) => {
  function applyTitleBlock(article) {
    const first = article.firstElementChild;
    if (first?.tagName !== 'H1') {
      return;
    }

    const lede = first.nextElementSibling?.tagName === 'P' ? first.nextElementSibling : null;

    const block = createElement('header');
    block.className = 'pv-titleblock';

    const main = createElement('div');
    main.className = 'pv-tb-main';

    first.querySelector('.pv-anchor')?.remove();
    first.classList.add('pv-tb-title');
    main.append(first);

    if (lede) {
      lede.classList.add('pv-tb-lede');
      main.append(lede);
    }

    block.append(main);
    article.prepend(block);
  }

  root.Plainview = Object.assign(root.Plainview || {}, { applyTitleBlock });
})(globalThis);
