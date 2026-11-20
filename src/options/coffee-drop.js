import { createDragHandlers } from './coffee-drag.js';
import { createRope } from './coffee-rope.js';

const button = document.querySelector('.coffee-fab');

if (button) {
  const state = {
    anchorX: 0,
    dragging: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    upDistance: 0,
  };
  const rope = createRope(button, state);
  const handlers = createDragHandlers({ button, state, rope, drawRope: rope.draw });

  button.addEventListener('dragstart', (event) => event.preventDefault());
  button.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
      return;
    }
    state.startX = event.clientX;
    state.startY = event.clientY;
    const rect = button.getBoundingClientRect();
    state.anchorX = rect.left + rect.width / 2;
    state.offsetX = 0;
    state.offsetY = 0;
    state.moved = false;
    state.suppressClick = false;
    state.dragging = true;
    globalThis.addEventListener('mousemove', handlers.move);
    globalThis.addEventListener('mouseup', handlers.end);
  });
  button.addEventListener(
    'click',
    (event) => {
      if (state.suppressClick) {
        event.preventDefault();
        state.suppressClick = false;
      }
    },
    true,
  );
}
