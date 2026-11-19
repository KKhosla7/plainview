const SCROLL_SETTLE_MS = 50;
const MAX_ACTIVE_LINE = 160;
const VIEWPORT_LINE_RATIO = 0.35;

function activationPoints(tops, maxScroll, viewport, line) {
  const count = tops.length;
  if (count === 0) {
    return [];
  }

  if (count === 1 || maxScroll <= 0) {
    return tops.map(() => 0);
  }
  const points = tops.map((top, index) => {
    if (index === 0) {
      return 0;
    }

    return Math.min(maxScroll, Math.max(0, top - line));
  });
  for (let index = 1; index < points.length; index += 1) {
    if (points[index] < points[index - 1]) {
      points[index] = points[index - 1];
    }
  }

  let firstClamped = points.indexOf(maxScroll);
  if (firstClamped === -1) {
    return points;
  }

  while (firstClamped > 0 && points[firstClamped - 1] === maxScroll) {
    firstClamped -= 1;
  }
  const trailing = count - firstClamped;
  if (trailing <= 1) {
    return points;
  }
  const previous = firstClamped > 0 ? points[firstClamped - 1] : 0;
  const from = Math.max(previous, maxScroll - viewport);
  const span = maxScroll - from;
  for (let index = 0; index < trailing; index += 1) {
    points[firstClamped + index] = from + (span * (index + 1)) / trailing;
  }
  points[count - 1] = maxScroll;
  return points;
}

function scrollItems(headings) {
  const items = [];
  for (const heading of headings) {
    const target = document.querySelector(`[id=${JSON.stringify(heading.id)}]`);
    if (target) {
      items.push({
        id: heading.id,
        top: target.getBoundingClientRect().top + globalThis.scrollY,
      });
    }
  }

  return items;
}

function activeHeading(points, items) {
  let active = items[0].id;
  for (let index = 0; index < points.length; index += 1) {
    if (points[index] <= globalThis.scrollY + 1) {
      active = items[index].id;
    } else {
      break;
    }
  }

  return active;
}

function createScrollSpy({ nav, headings }) {
  const links = new Map();

  for (const link of nav.querySelectorAll('a[href]')) {
    if (!link.hash) {
      continue;
    }
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

    const items = scrollItems(headings);
    if (items.length === 0) {
      return;
    }

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - globalThis.innerHeight);
    const line = Math.min(MAX_ACTIVE_LINE, globalThis.innerHeight * VIEWPORT_LINE_RATIO);
    const points = activationPoints(
      items.map((item) => item.top),
      maxScroll,
      globalThis.innerHeight,
      line,
    );
    activate(activeHeading(points, items));
  }

  function schedule() {
    if (timer) {
      return;
    }
    timer = globalThis.setTimeout(update, SCROLL_SETTLE_MS);
  }

  globalThis.addEventListener('scroll', schedule, { passive: true });
  globalThis.addEventListener('resize', schedule);
  globalThis.addEventListener('hashchange', schedule);
  update();

  return { update: schedule };
}

export { createScrollSpy };
