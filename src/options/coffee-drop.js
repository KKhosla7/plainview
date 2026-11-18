/* global window */
(() => {
  const button = document.querySelector('.coffee-fab');
  if (!button) {
    return;
  }

  let startY = 0;
  let dragging = false;
  let suppressClick = false;

  function move(event) {
    if (!dragging) {
      return;
    }
    const delta = Math.max(0, event.clientY - startY);
    if (delta > 4) {
      event.preventDefault();
      button.classList.add('is-dragging');
      button.style.setProperty('--coffee-string-extra', `${delta}px`);
      button.style.transform = `translateY(${delta}px)`;
    }
  }

  function end() {
    if (!dragging) {
      return;
    }
    dragging = false;
    globalThis.removeEventListener('mousemove', move);
    globalThis.removeEventListener('mouseup', end);
    if (!button.classList.contains('is-dragging')) {
      return;
    }
    suppressClick = true;
    button.classList.remove('is-dragging');
    button.classList.add('is-hiding');
    button.style.removeProperty('--coffee-string-extra');
    button.style.transform = '';
  }

  button.addEventListener('dragstart', (event) => event.preventDefault());
  button.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    startY = event.clientY;
    dragging = true;
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
