/* global Plainview */
/*
 * Remembers the reading position per document. The stored value is restored
 * after the reader mounts, and every user scroll is saved with a short
 * debounce. When there is no saved value, the caller's hash fallback runs.
 */
(function (root) {
  'use strict';

  function createScrollMemory({ key, initialY, onRestored }) {
    const parsed = Number(initialY);
    const target =
      initialY === null || initialY === undefined || !Number.isFinite(parsed)
        ? null
        : parsed;

    let armed = false;
    let timer = 0;
    let userMoved = false;

    function saveNow() {
      if (!armed) return;
      Plainview.saveSetting(key, window.scrollY);
    }

    function onScroll() {
      if (!armed) return;
      userMoved = true;
      clearTimeout(timer);
      timer = window.setTimeout(saveNow, 250);
    }

    function markMoved() {
      userMoved = true;
    }

    function applyTarget() {
      if (target === null) return;
      Plainview.scrollToInstant(target);
    }

    function applyAndReport(fallback) {
      if (target !== null) applyTarget();
      else if (fallback) fallback();
      requestAnimationFrame(() => {
        if (onRestored) onRestored(window.scrollY);
      });
    }

    function reapply(fallback) {
      if (userMoved) return;
      applyAndReport(fallback);
    }

    function restore(fallback) {
      applyAndReport(fallback);

      requestAnimationFrame(() => {
        window.setTimeout(() => {
          armed = true;
        }, 200);
      });

      if (target !== null && document.fonts?.ready) {
        document.fonts.ready
          .then(() => {
            if (!userMoved) applyAndReport(null);
          })
          .catch(() => {});
      }

      window.addEventListener('wheel', markMoved, { passive: true });
      window.addEventListener('touchstart', markMoved, { passive: true });
      window.addEventListener('pointerdown', markMoved, { passive: true });
      window.addEventListener('keydown', markMoved);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pagehide', saveNow);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveNow();
      });
    }

    return { restore, reapply };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createScrollMemory });
})(globalThis);
