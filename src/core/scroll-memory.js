import { scrollToInstant } from './scroll-utils.js';
import { saveSetting } from './settings.js';

const SAVE_DELAY_MS = 250;
const RESTORE_DELAY_MS = 200;

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

function applyScrollReport(target, onRestored, onFallback) {
  if (target !== null) {
    scrollToInstant(target);
  } else if (onFallback) {
    onFallback();
  }
  requestAnimationFrame(() => {
    if (onRestored) {
      onRestored(globalThis.scrollY);
    }
  });
}

function armAfterRestore(setArmed) {
  requestAnimationFrame(() => {
    globalThis.setTimeout(() => {
      setArmed(true);
    }, RESTORE_DELAY_MS);
  });
}

function createScrollSaver({ key, state }) {
  let timer = 0;

  function saveNow() {
    if (!state.armed) {
      return;
    }
    saveSetting(key, globalThis.scrollY);
  }

  function onScroll() {
    if (!state.armed) {
      return;
    }
    state.setMoved();
    clearTimeout(timer);
    timer = globalThis.setTimeout(saveNow, SAVE_DELAY_MS);
  }

  function markMoved() {
    state.setMoved();
  }

  return { markMoved, onScroll, saveNow };
}

function createScrollMemory({ key, initialY, onRestored }) {
  const parsed = Number(initialY);
  const target =
    initialY === null || initialY === undefined || !Number.isFinite(parsed) ? null : parsed;

  let userMoved = false;
  const state = {
    armed: false,
    setMoved: () => {
      userMoved = true;
    },
  };
  const { markMoved, onScroll, saveNow } = createScrollSaver({ key, state });

  function apply(fallback) {
    applyScrollReport(target, onRestored, fallback);
  }

  function reapply(fallback) {
    if (userMoved) {
      return;
    }
    apply(fallback);
  }

  function restore(fallback) {
    apply(fallback);

    armAfterRestore((value) => {
      state.armed = value;
    });

    restoreAfterFonts({ target, isUserMoved: () => userMoved, applyAndReport: apply });
    bindRestoreEvents({ saveNow, onScroll, markMoved });
  }

  return { restore, reapply };
}

export { createScrollMemory };
