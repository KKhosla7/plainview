/* global Plainview */
((root) => {
  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function buildToc(headings) {
    const usable = headings.filter((heading) => heading.level <= 4);
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

  function createTocDrawer({ headings, button, app, scrim }) {
    const allHeadings = headings || [];
    const usable = allHeadings.filter((heading) => heading.level <= 4);
    const nav = buildToc(allHeadings);
    if (!nav) {
      button.hidden = true;
      return { element: null, close: () => false, isOpen: () => false };
    }

    let open = false;

    function close() {
      open = false;
      app.classList.remove('pv-toc-open');
      button.setAttribute('aria-expanded', 'false');
      scrim.hidden = true;
      button.focus();
    }

    function show() {
      open = true;
      app.classList.add('pv-toc-open');
      button.setAttribute('aria-expanded', 'true');
      scrim.hidden = false;
      nav.querySelector('a')?.focus();
    }

    function toggle() {
      if (open) {
        close();
      } else {
        show();
      }
    }

    button.addEventListener('click', toggle);
    scrim.addEventListener('click', close);
    nav.addEventListener('click', (event) => {
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

      let target = null;
      try {
        target = document.querySelector(
          `[id=${JSON.stringify(decodeURIComponent(link.hash.slice(1)))}]`,
        );
      } catch {
        target = null;
      }

      if (!target) {
        return;
      }

      event.preventDefault();
      Plainview.scrollElementIntoViewSmooth(target);
      history.pushState(null, '', link.hash);
      if (globalThis.matchMedia('(max-width: 1079px)').matches) {
        close();
      }
    });

    const spy = Plainview.createScrollSpy({ nav, headings: usable });
    return { element: nav, close, isOpen: () => open, update: spy.update };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createTocDrawer });
})(globalThis);
