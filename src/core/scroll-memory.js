import { scrollToInstant } from './scroll-utils.js';
import { saveSetting } from './settings.js';

const SaveDelayMs = 250;
const RestoreDelayMs = 200;

function restoreAfterFonts({ target, isUserMoved, applyAndReport }) {
  if (target === null || !document.fonts?.ready) {
    return;
  }

  document.fonts.ready.then(
    () => {
      if (!isUserMoved()) {
        applyAndReport(null);
      }

      return true;
    },
    () => false,
  );
}

function bindRestoreEvents({ saveNow, onScroll, markMoved }) {
  globalThis.addEventListener('wheel', markMoved, { passive: true });
  globalThis.addEventListener('touchstart', markMoved, { passive: true });
  globalThis.addEventListener('pointerdown', markMoved, { passive: true });
  globalThis.addEventListener('keydown', markMoved);
  globalThis.addEventListener('scroll', onScroll, { passive: true });
  globalThis.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveNow();
    }
  });
}

function createScrollMemory({ key, initialY, onRestored }) {
  const parsed = Number(initialY);
  const target =
    initialY === null || initialY === undefined || !Number.isFinite(parsed) ? null : parsed;

  let armed = false;
  let timer = 0;
  let userMoved = false;

  function saveNow() {
    if (!armed) {
      return;
    }
    saveSetting(key, globalThis.scrollY);
  }

  function onScroll() {
    if (!armed) {
      return;
    }
    userMoved = true;
    clearTimeout(timer);
    timer = globalThis.setTimeout(saveNow, SaveDelayMs);
  }

  function markMoved() {
    userMoved = true;
  }

  function applyTarget() {
    if (target === null) {
      return;
    }
    scrollToInstant(target);
  }

  function applyAndReport(fallback) {
    if (target !== null) {
      applyTarget();
    } else if (fallback) {
      fallback();
    }
    requestAnimationFrame(() => {
      if (onRestored) {
        onRestored(globalThis.scrollY);
      }
    });
  }

  function reapply(fallback) {
    if (userMoved) {
      return;
    }
    applyAndReport(fallback);
  }

  function restore(fallback) {
    applyAndReport(fallback);

    requestAnimationFrame(() => {
      globalThis.setTimeout(() => {
        armed = true;
      }, RestoreDelayMs);
    });

    restoreAfterFonts({ target, isUserMoved: () => userMoved, applyAndReport });
    bindRestoreEvents({ saveNow, onScroll, markMoved });
  }

  return { restore, reapply };
}

export { createScrollMemory };
