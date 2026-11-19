import { createElement } from '../core/dom.js';
import { scrollToInstant } from '.././core/scroll-utils.js';

const SHOW_AFTER = 600;
const MAX_DURATION = 700;
const MIN_DURATION = 250;
const DURATION_RATIO = 0.35;
const EASE_EXPONENT = 3;

function createScrollTop({ app }) {
  const button = createElement('button');
  button.type = 'button';
  button.className = 'pv-scroll-top';
  button.textContent = '↑';
  button.title = 'Back to top';
  button.setAttribute('aria-label', 'Back to top');
  button.hidden = true;
  let animation = 0;

  function update() {
    button.hidden = globalThis.scrollY < SHOW_AFTER;
  }

  function scrollTop() {
    globalThis.cancelAnimationFrame(animation);
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scrollToInstant(0);
      return;
    }
    const startY = globalThis.scrollY;
    if (startY <= 0) {
      return;
    }
    const htmlRoot = document.documentElement;
    const previous = htmlRoot.style.scrollBehavior;
    htmlRoot.style.scrollBehavior = 'auto';
    const started = performance.now();
    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, startY * DURATION_RATIO));
    function step(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - progress) ** EASE_EXPONENT;
      globalThis.scrollTo(0, Math.round(startY * (1 - eased)));
      if (progress < 1) {
        animation = globalThis.requestAnimationFrame(step);
      } else {
        htmlRoot.style.scrollBehavior = previous;
        animation = 0;
      }
    }
    animation = globalThis.requestAnimationFrame(step);
  }

  button.addEventListener('click', scrollTop);

  globalThis.addEventListener('scroll', update, { passive: true });
  update();
  app.append(button);
  return { element: button, update };
}

export { createScrollTop };
