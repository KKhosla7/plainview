import { formatGlyph } from '.././app/format-glyph.js';
import { icons } from '.././app/icons.js';
import { createElement, el } from '../core/dom.js';

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
    kind === 'html' ? icons.html() : el('span', 'pv-format-glyph', formatGlyph(glyphLabel)),
    globalThis.document.createTextNode(label),
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
  globalThis.document.addEventListener('click', close);
  globalThis.document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      close();
      button.focus();
    }
  });
  return { close, open, toggle };
}

export { createExportCell, createMenuController, createMenuShell };
