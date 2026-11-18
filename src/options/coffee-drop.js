/* global window */
(() => {
  const button = document.querySelector('.coffee-fab');
  if (!button) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let anchorX = 0;
  let rope = null;
  let dragging = false;
  let suppressClick = false;

  function ensureRope() {
    if (rope) {
      return rope;
    }
    rope = document.createElement('span');
    rope.className = 'coffee-rope';
    rope.setAttribute('aria-hidden', 'true');
    document.body.append(rope);
    return rope;
  }

  function move(event) {
    if (!dragging) {
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    button.style.transform = `translate(${dx}px, ${dy}px)`;
    const rect = button.getBoundingClientRect();
    const cupX = rect.left + rect.width / 2;
    const cupY = rect.top + rect.height / 2;
    const length = Math.hypot(cupX - anchorX, cupY);
    const angle = (Math.atan2(cupX - anchorX, cupY) * 180) / Math.PI;
    const line = ensureRope();
    line.style.left = `${anchorX}px`;
    line.style.height = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
  }

  function end() {
    if (!dragging) {
      return;
    }
    dragging = false;
    globalThis.removeEventListener('mousemove', move);
    globalThis.removeEventListener('mouseup', end);
    suppressClick = true;
    button.classList.remove('is-dragging');
    button.classList.add('is-hiding');
    button.style.transform = '';
    rope?.remove();
    rope = null;
  }

  button.addEventListener('dragstart', (event) => event.preventDefault());
  button.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    startX = event.clientX;
    startY = event.clientY;
    const rect = button.getBoundingClientRect();
    anchorX = rect.left + rect.width / 2;
    dragging = true;
    button.classList.add('is-dragging');
    globalThis.addEventListener('mousemove', move);
    globalThis.addEventListener('mouseup', end);
  });

  button.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        suppressClick = false;
      }
    },
    true,
  );
})();
