import { DRAG_THRESHOLD } from './coffee-config.js';
import { releaseCoffee } from './coffee-release.js';

function createDragHandlers({ button, state, rope, drawRope }) {
  function move(event) {
    if (!state.dragging) {
      return;
    }
    state.offsetX = event.clientX - state.startX;
    state.offsetY = event.clientY - state.startY;
    if (!state.moved && Math.hypot(state.offsetX, state.offsetY) <= DRAG_THRESHOLD) {
      return;
    }

    if (!state.moved) {
      state.moved = true;
      button.classList.add('is-dragging');
    }
    button.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
    drawRope();
  }

  function end() {
    if (!state.dragging) {
      return;
    }
    state.dragging = false;
    globalThis.removeEventListener('mousemove', move);
    globalThis.removeEventListener('mouseup', end);
    if (!state.moved) {
      return;
    }
    button.dataset.coffeeSuppress = 'true';
    button.classList.remove('is-dragging');
    button.classList.add('is-releasing');
    releaseCoffee({
      button,
      state,
      drawRope,
      hideRope: rope.hide,
      onFinish: rope.remove,
    });
  }

  return { end, move };
}

export { createDragHandlers };
