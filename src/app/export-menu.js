import { createElement, el } from '.././core/dom.js';

/* global Plainview */
/*
 * Shared export-menu shell, item rendering and dismissal behavior. The live
 * reader and standalone exports only provide their own download tasks.
 */
((root) => {
  function createMenuShell(titleText) {
    const menu = createElement('div');
    menu.className = 'pv-export-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    const title = createElement('div');
    title.className = 'pv-export-menu-title';
    title.textContent = titleText;
    menu.append(title);
    return { menu, title };
  }

  function createExportCell({ ariaLabel, glyphLabel, kind = 'data', label, title }) {
    const button = createElement('button');
    button.type = 'button';
    button.className = 'pv-export-cell';
    button.setAttribute('aria-label', ariaLabel);
    button.title = title;
    button.append(
      kind === 'html'
        ? Plainview.icons.html()
        : el('span', 'pv-format-glyph', Plainview.formatGlyph(glyphLabel)),
      root.document.createTextNode(label),
    );
    return button;
  }

  function createMenuController({ button, menu, onOpen }) {
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');

    function open() {
      onOpen();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      menu.querySelector('button')?.focus();
    }

    function close() {
      if (menu.hidden) {
        return;
      }
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }

    function toggle() {
      if (menu.hidden) {
        open();
      } else {
        close();
      }
    }

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      toggle();
    });
    menu.addEventListener('click', (event) => event.stopPropagation());
    root.document.addEventListener('click', close);
    root.document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        close();
        button.focus();
      }
    });
    return { close, open, toggle };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createExportCell,
    createMenuController,
    createMenuShell,
  });
})(globalThis);
