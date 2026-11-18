/* global window */
(() => {
  const button = document.querySelector('.coffee-fab');
  if (!button) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let anchorX = 0;
  let offsetX = 0;
  let offsetY = 0;
  let rope = null;
  let dragging = false;
  let suppressClick = false;

  function ensureRope() {
    if (rope) {
      return rope;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('coffee-rope');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    svg.append(path);
    document.body.append(svg);
    rope = { path, svg };
    return rope;
  }

  function drawRope() {
    const rect = button.getBoundingClientRect();
    const cupX = rect.left + rect.width / 2;
    const cupY = rect.top + rect.height / 2;
    const { path } = ensureRope();
    const midX = (anchorX + cupX) / 2;
    const sag = Math.min(90, Math.abs(cupX - anchorX) * 0.45);
    const midY = cupY / 2 + sag;
    path.setAttribute('d', `M ${anchorX} 0 Q ${midX} ${midY} ${cupX} ${cupY}`);
  }

  function move(event) {
    if (!dragging) {
      return;
    }
    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    button.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    drawRope();
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
    button.classList.add('is-releasing');
    const fromX = offsetX;
    const fromY = offsetY;
    const releaseMs = 1100;
    const releaseStart = performance.now();
    const startRect = button.getBoundingClientRect();
    const travel = startRect.top + startRect.height + 320;

    function finish() {
      rope?.svg.remove();
      rope = null;
      button.classList.remove('is-releasing');
      button.classList.add('is-retracted');
      button.style.removeProperty('--coffee-string-extra');
    }

    function release(now) {
      const progress = Math.min(1, (now - releaseStart) / releaseMs);
      const eased = progress ** 2 * (3 - 2 * progress);
      offsetX = fromX * (1 - eased);
      offsetY = fromY + (-travel - fromY) * eased;
      button.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      if (button.getBoundingClientRect().bottom > 0) {
        drawRope();
      } else if (rope) {
        rope.svg.style.display = 'none';
      }

      if (progress < 1) {
        globalThis.requestAnimationFrame(release);
        return;
      }
      finish();
    }

    globalThis.requestAnimationFrame(release);
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
    offsetX = 0;
    offsetY = 0;
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
