/* global Plainview */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function zoomButton(className, label, ariaLabel) {
    const button = el('button', className, label);
    button.type = 'button';
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
    return button;
  }

  function createZoom({ initialZoom } = {}) {
    const { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_KEY } = Plainview;

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
      : 100;

    function apply() {
      root.document.documentElement.style.setProperty(
        '--pv-zoom',
        String(zoom / 100),
      );
      value.textContent = `${zoom}%`;
      out.disabled = zoom <= ZOOM_MIN;
      inButton.disabled = zoom >= ZOOM_MAX;
    }

    function setZoom(next, options = {}) {
      const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(next)));
      if (clamped === zoom) return;
      zoom = clamped;
      apply();
      if (options.persist !== false) {
        Plainview.saveSetting(ZOOM_KEY, zoom);
      }
    }

    out.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
    inButton.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
    value.addEventListener('click', () => setZoom(100));

    apply();

    return {
      element,
      apply,
      setZoom,
      getZoom: () => zoom,
      setVisible(visible) {
        element.hidden = !visible;
      },
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createZoom });
})(globalThis);
