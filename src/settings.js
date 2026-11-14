/* global MDView */
(function (root) {
  'use strict';

  const THEMES = ['light', 'dark'];
  const THEME_KEY = 'mdview.theme';
  const ZOOM_KEY = 'mdview.zoom';
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 250;
  const ZOOM_STEP = 10;

  function storageArea() {
    const api = root.browser ?? root.chrome;
    return api?.storage?.local ?? null;
  }

  async function loadSetting(key, fallback) {
    try {
      const area = storageArea();
      if (area) {
        const data = await area.get(key);
        if (data && data[key] !== undefined) return data[key];
      }
    } catch {
      /* fall through */
    }
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function saveSetting(key, value) {
    try {
      const area = storageArea();
      if (area) {
        const result = area.set({ [key]: value });
        if (result && typeof result.catch === 'function') result.catch(() => {});
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* ignore */
    }
  }

  function validTheme(value) {
    return THEMES.includes(value) ? value : null;
  }

  root.MDView = Object.assign(root.MDView || {}, {
    THEMES,
    THEME_KEY,
    ZOOM_KEY,
    ZOOM_MIN,
    ZOOM_MAX,
    ZOOM_STEP,
    loadSetting,
    saveSetting,
    validTheme,
  });
})(globalThis);
