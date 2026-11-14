/* global Plainview */
((root) => {
  function createScrollSpy({ nav, headings }) {
    const links = new Map();

    for (const link of nav.querySelectorAll('a[href^="#"]')) {
      let id = '';
      try {
        id = decodeURIComponent(link.hash.slice(1));
      } catch {
        id = link.hash.slice(1);
      }
      if (id) {
        links.set(id, link);
      }
    }

    let timer = 0;

    function activate(id) {
      for (const [key, link] of links) {
        const active = key === id;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    }

    function update() {
      timer = 0;
      if (!nav.isConnected || (nav.offsetParent === null && nav.getClientRects().length === 0)) {
        return;
      }

      const offset = 90;
      let active = headings[0]?.id;
      for (const heading of headings) {
        const target = document.getElementById(heading.id);
        if (!target) {
          continue;
        }
        if (target.getBoundingClientRect().top <= offset) {
          active = heading.id;
        } else {
          break;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        active = headings.at(-1)?.id || active;
      }
      if (active) {
        activate(active);
      }
    }

    function schedule() {
      if (timer) {
        return;
      }
      timer = window.setTimeout(update, 50);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    update();

    return { update: schedule };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createScrollSpy });
})(globalThis);
