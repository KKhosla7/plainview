/* global MDView */
(function (root) {
  'use strict';

  function withAutoBehavior(fn) {
    const element = document.documentElement;
    const previous = element.style.scrollBehavior;
    element.style.scrollBehavior = 'auto';
    try {
      fn();
    } finally {
      element.style.scrollBehavior = previous;
    }
  }

  function scrollToInstant(top) {
    withAutoBehavior(() => window.scrollTo(0, top));
  }

  function scrollElementIntoViewInstant(target) {
    withAutoBehavior(() => target.scrollIntoView({ block: 'start' }));
  }

  function scrollElementIntoViewSmooth(target) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scrollElementIntoViewInstant(target);
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.MDView = Object.assign(root.MDView || {}, {
    scrollToInstant,
    scrollElementIntoViewInstant,
    scrollElementIntoViewSmooth,
  });
})(globalThis);
