/* global window */
(() => {
  const button = document.querySelector('.coffee-fab');
  if (!button) {
    return;
  }

  let startY = 0;
  let dragged = false;
  let suppressClick = false;

  button.addEventListener('dragstart', (event) => event.preventDefault());

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    startY = event.clientY;
    dragged = false;
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener('pointermove', (event) => {
    if (!button.hasPointerCapture(event.pointerId)) {
      return;
    }
    const delta = Math.max(0, event.clientY - startY);
    if (delta > 4) {
      dragged = true;
      button.classList.add('is-dragging');
      button.style.setProperty('--coffee-string-extra', `${Math.min(delta, 180)}px`);
      button.style.transform = `translateY(${Math.min(delta, 180)}px)`;
    }
  });

  button.addEventListener('pointerup', (event) => {
    if (!dragged) {
      return;
    }
    event.preventDefault();
    suppressClick = true;
    button.releasePointerCapture(event.pointerId);
    button.classList.remove('is-dragging');
    button.classList.add('is-hiding');
    button.style.removeProperty('--coffee-string-extra');
    button.style.transform = '';
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
