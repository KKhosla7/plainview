import { createElement } from '../core/dom.js';
import { saveSetting, ZOOM_KEY, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../core/settings.js';

function el(tag, className, text) {
  const node = createElement(tag);
  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

const DEFAULT_ZOOM = 100;
const PERCENT_DIVISOR = 100;

function zoomButton(className, label, ariaLabel) {
  const button = el('button', className, label);
  button.type = 'button';
  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }

  return button;
}

function createZoom({ initialZoom } = {}) {
  const element = el('div', 'pv-zoom');
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Content zoom');

  const out = zoomButton('pv-zoom-button', '−', 'Zoom out');
  const value = zoomButton('pv-zoom-value', '100%');
  value.title = 'Reset zoom to 100%';
  const inButton = zoomButton('pv-zoom-button', '+', 'Zoom in');
  element.append(out, value, inButton);

  const stored = Number(initialZoom);
  let zoom = Number.isFinite(stored)
    ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(stored)))
    : DEFAULT_ZOOM;

  function apply() {
    globalThis.document.documentElement.style.setProperty(
      '--pv-zoom',
      String(zoom / PERCENT_DIVISOR),
    );
    value.textContent = `${zoom}%`;
    out.disabled = zoom <= ZOOM_MIN;
    inButton.disabled = zoom >= ZOOM_MAX;
  }

  function setZoom(next, options = {}) {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(next)));
    if (clamped === zoom) {
      return;
    }
    zoom = clamped;
    apply();
    if (options.persist !== false) {
      saveSetting(ZOOM_KEY, zoom);
    }
  }

  out.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
  inButton.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  value.addEventListener('click', () => setZoom(DEFAULT_ZOOM));

  apply();

  return {
    element,
    setZoom,
    getZoom: () => zoom,
    setVisible(visible) {
      element.hidden = !visible;
    },
  };
}

export { createZoom };
