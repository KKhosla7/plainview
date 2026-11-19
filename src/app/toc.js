import { createElement } from '../core/dom.js';
import { scrollElementIntoViewSmooth } from '../core/scroll-utils.js';
import { createScrollSpy } from './scroll-spy.js';

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

const MAX_TOC_LEVEL = 4;

function buildToc(headings) {
  const usable = headings.filter((heading) => heading.level <= MAX_TOC_LEVEL);
  if (usable.length < 2) {
    return null;
  }

  const minLevel = Math.min(...usable.map((heading) => heading.level));
  const nav = el('nav', 'pv-toc');
  nav.setAttribute('aria-label', 'Table of contents');

  const list = el('ul', 'pv-toc-list');
  for (const heading of usable) {
    const link = el('a', 'pv-toc-link', heading.text);
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.style.setProperty('--pv-depth', String(heading.level - minLevel));

    const item = el('li', 'pv-toc-item');
    item.append(link);
    list.append(item);
  }

  nav.append(el('div', 'pv-toc-title', 'Contents'), list);
  return nav;
}

function tocTarget(link) {
  try {
    return document.querySelector(`[id=${JSON.stringify(decodeURIComponent(link.hash.slice(1)))}]`);
  } catch {
    return null;
  }
}

function handleTocClick(event, close) {
  const link = event.target.closest('a');
  if (!link || link.hash.length <= 1) {
    return;
  }

  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const target = tocTarget(link);
  if (!target) {
    return;
  }

  event.preventDefault();
  scrollElementIntoViewSmooth(target);
  history.pushState(null, '', link.hash);
  if (globalThis.matchMedia('(max-width: 1079px)').matches) {
    close();
  }
}

function createDrawerState({ app, button, scrim, nav }) {
  let open = false;

  function close() {
    open = false;
    app.classList.remove('pv-toc-open');
    button.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
    button.focus();
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    open = true;
    app.classList.add('pv-toc-open');
    button.setAttribute('aria-expanded', 'true');
    scrim.hidden = false;
    nav.querySelector('a')?.focus();
  }

  return { close, isOpen: () => open, toggle };
}

function createTocDrawer({ headings, button, app, scrim }) {
  const allHeadings = headings || [];
  const usable = allHeadings.filter((heading) => heading.level <= MAX_TOC_LEVEL);
  const nav = buildToc(allHeadings);
  if (!nav) {
    button.hidden = true;
    return { element: null, close: () => false, isOpen: () => false };
  }

  const drawer = createDrawerState({ app, button, scrim, nav });

  button.addEventListener('click', drawer.toggle);
  scrim.addEventListener('click', drawer.close);
  nav.addEventListener('click', (event) => handleTocClick(event, drawer.close));

  const spy = createScrollSpy({ nav, headings: usable });
  return {
    element: nav,
    close: drawer.close,
    isOpen: drawer.isOpen,
    toggle: drawer.toggle,
    update: spy.update,
  };
}

export { createTocDrawer };
