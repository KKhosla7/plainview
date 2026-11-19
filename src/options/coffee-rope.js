import { MAX_SAG, SAG_RATIO } from './coffee-config.js';

function createRope(button, state) {
  let rope = null;

  function ensureRope() {
    if (rope) {
      return rope;
    }
    const SvgNamespace = document.querySelector('svg')?.namespaceURI;
    const svg = document.createElementNS(SvgNamespace, 'svg');
    svg.classList.add('coffee-rope');
    const path = document.createElementNS(SvgNamespace, 'path');
    path.setAttribute('fill', 'none');
    svg.append(path);
    document.body.append(svg);
    rope = { path, svg };
    return rope;
  }

  function draw() {
    const rect = button.getBoundingClientRect();
    const cupX = rect.left + rect.width / 2;
    const cupY = rect.top + rect.height / 2;
    const { path } = ensureRope();
    const midX = (state.anchorX + cupX) / 2;
    const sag = Math.min(MAX_SAG, Math.abs(cupX - state.anchorX) * SAG_RATIO);
    const midY = cupY / 2 + sag;
    path.setAttribute('d', `M ${state.anchorX} 0 Q ${midX} ${midY} ${cupX} ${cupY}`);
  }

  function hide() {
    if (rope) {
      rope.svg.style.display = 'none';
    }
  }

  function remove() {
    rope?.svg.remove();
    rope = null;
  }

  return { draw, hide, remove };
}

export { createRope };
