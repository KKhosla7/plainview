import {
  ASCEND_DISTANCE,
  ASCEND_MS,
  EASE_POWER,
  RETRACT_MS,
  SQUASH_COEFFICIENT,
  SQUASH_FACTOR,
} from './coffee-config.js';

function finishRelease(button, onFinish) {
  button.classList.remove('is-releasing');
  button.classList.add('is-retracted');
  button.style.removeProperty('--coffee-string-extra');
  onFinish();
}

function releaseCoffee({ button, state, drawRope, hideRope, onFinish }) {
  const fromX = state.offsetX;
  const fromY = state.offsetY;
  const retractStart = performance.now();
  let ascendStart = 0;

  function ascend(now) {
    const progress = Math.min(1, (now - ascendStart) / ASCEND_MS);
    const eased = progress ** SQUASH_FACTOR * (SQUASH_COEFFICIENT - SQUASH_FACTOR * progress);
    state.offsetY = -state.upDistance * eased;
    button.style.transform = `translate(0, ${state.offsetY}px)`;
    if (button.getBoundingClientRect().bottom > 0) {
      drawRope();
    } else {
      hideRope();
    }

    if (progress < 1) {
      globalThis.requestAnimationFrame(ascend);
      return;
    }
    finishRelease(button, onFinish);
  }

  function retract(now) {
    const progress = Math.min(1, (now - retractStart) / RETRACT_MS);
    const eased = 1 - (1 - progress) ** EASE_POWER;
    state.offsetX = fromX * (1 - eased);
    state.offsetY = fromY * (1 - eased);
    button.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
    drawRope();
    if (progress < 1) {
      globalThis.requestAnimationFrame(retract);
      return;
    }
    const startRect = button.getBoundingClientRect();
    state.upDistance = startRect.top + startRect.height + ASCEND_DISTANCE;
    ascendStart = performance.now();
    globalThis.requestAnimationFrame(ascend);
  }

  const startRect = button.getBoundingClientRect();
  state.upDistance = startRect.top + startRect.height + ASCEND_DISTANCE;
  globalThis.requestAnimationFrame(retract);
}

export { releaseCoffee };
