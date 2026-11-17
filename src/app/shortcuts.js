/* global Plainview */
/*
 * Keyboard and wheel shortcuts. Shortcuts never capture keys while the user is
 * typing in a form control or editable element.
 */
((root) => {
  function isEditableTarget(target) {
    const editable = target?.closest?.('input, textarea, select, [contenteditable]');
    return Boolean(editable && editable.getAttribute('contenteditable') !== 'false');
  }

  function handleViewKey(event, viewSwitcher, shortcuts) {
    let toggle = false;
    if (
      shortcuts === 'alt-s' &&
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key.toLowerCase() === 's' || event.code === 'KeyS')
    ) {
      toggle = true;
    } else if (
      shortcuts === 'alt-arrows' &&
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      toggle = true;
    } else if (
      shortcuts === 'ctrl-shift-arrows' &&
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      !event.altKey &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      toggle = true;
    }

    if (!toggle) {
      return;
    }
    event.preventDefault();
    viewSwitcher.setView(viewSwitcher.getView() === 'html' ? 'source' : 'html');
  }

  function handleEscape(viewSwitcher, toc) {
    if (toc.isOpen()) {
      toc.close();
      return;
    }

    if (viewSwitcher.getView() === 'source') {
      viewSwitcher.setView('html');
    }
  }

  function handleZoomKey(event, viewSwitcher, zoom, step) {
    if (viewSwitcher.getView() !== 'html' || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom.setZoom(zoom.getZoom() + step);
    } else if (event.key === '-') {
      event.preventDefault();
      zoom.setZoom(zoom.getZoom() - step);
    } else if (event.key === '0') {
      event.preventDefault();
      zoom.setZoom(100);
    }
  }

  function wireShortcuts({ viewSwitcher, zoom, toc, shortcuts }) {
    const { ZOOM_STEP } = Plainview;

    document.addEventListener(
      'wheel',
      (event) => {
        if (viewSwitcher.getView() !== 'html' || !(event.ctrlKey || event.metaKey)) {
          return;
        }
        event.preventDefault();
        zoom.setZoom(zoom.getZoom() + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
      },
      { passive: false },
    );

    document.addEventListener('keydown', (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'Escape') {
        handleEscape(viewSwitcher, toc);
        return;
      }
      handleViewKey(event, viewSwitcher, shortcuts);
      handleZoomKey(event, viewSwitcher, zoom, ZOOM_STEP);
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { wireShortcuts });
})(globalThis);
