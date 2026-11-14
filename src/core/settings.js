/* global Plainview */
(function (root) {
  'use strict';

  const THEMES = ['light', 'dark'];
  const THEME_KEY = 'plainview.theme';
  const ZOOM_KEY = 'plainview.zoom';
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 250;
  const ZOOM_STEP = 10;
  // Legacy namespace kept only for the one-time settings migration.
  const LEGACY_PREFIX = 'mdview.';
  const PREFIX = 'plainview.';

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

  let migration = null;

  async function migrateLegacySettings() {
    if (migration) return migration;
    migration = (async () => {
      try {
        const area = storageArea();
        if (area) {
          const all = await area.get(null);
          const updates = {};
          const removals = [];
          for (const [key, value] of Object.entries(all)) {
            if (!key.startsWith(LEGACY_PREFIX)) continue;
            updates[PREFIX + key.slice(LEGACY_PREFIX.length)] = value;
            removals.push(key);
          }
          if (removals.length > 0) {
            await area.set(updates);
            await area.remove(removals);
          }
        }
      } catch {
        /* keep the old keys if the extension storage is unavailable */
      }

      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          keys.push(localStorage.key(i));
        }
        for (const key of keys) {
          if (!key?.startsWith(LEGACY_PREFIX)) continue;
          localStorage.setItem(
            PREFIX + key.slice(LEGACY_PREFIX.length),
            localStorage.getItem(key),
          );
          localStorage.removeItem(key);
        }
      } catch {
        /* localStorage is only a fallback */
      }
    })();
    return migration;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    migrateLegacySettings,
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
