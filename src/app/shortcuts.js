import { ZOOM_STEP } from '../core/settings.js';
import { shortcutConfig } from '.././core/shortcut-config.js';

function isEditableTarget(target) {
  const editable = target?.closest?.('input, textarea, select, [contenteditable]');
  return Boolean(editable && editable.getAttribute('contenteditable') !== 'false');
}

function focusSearch(app) {
  const input = app.querySelector('.pv-json-search .pv-json-input, .pv-json-path-input');
  input?.focus();
  return Boolean(input);
}

function handleConfiguredKey(event, { viewSwitcher, toc, theme, topbar, app, shortcuts }) {
  const config = shortcutConfig;
  if (config.matchesView(event, shortcuts.view)) {
    event.preventDefault();
    viewSwitcher.setView(viewSwitcher.getView() === 'html' ? 'source' : 'html');
    return true;
  }

  if (config.matchesKey(event, shortcuts.theme)) {
    event.preventDefault();
    theme.toggle();
    return true;
  }

  if (config.matchesKey(event, shortcuts.contents)) {
    event.preventDefault();
    toc.toggle();
    return true;
  }

  if (config.matchesKey(event, shortcuts.search)) {
    event.preventDefault();
    focusSearch(app);
    return true;
  }

  if (config.matchesKey(event, shortcuts.export)) {
    event.preventDefault();
    topbar.exportButton.click();
    return true;
  }

  return false;
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
    zoom.setZoom(FULL_ZOOM);
  }
}

const FULL_ZOOM = 100;

function wireShortcuts({ viewSwitcher, zoom, toc, theme, topbar, app, shortcuts }) {
  const resolved = shortcutConfig.normalizeShortcuts(shortcuts);

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
    const handled = handleConfiguredKey(event, {
      viewSwitcher,
      toc,
      theme,
      topbar,
      app,
      shortcuts: resolved,
    });
    if (!handled) {
      handleZoomKey(event, viewSwitcher, zoom, ZOOM_STEP);
    }
  });
}

export { wireShortcuts };
