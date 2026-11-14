/* global Plainview */
((root) => {
  const Themes = ['light', 'dark'];
  const ThemeKey = 'plainview.theme';
  const ZoomKey = 'plainview.zoom';
  const ZoomMin = 50;
  const ZoomMax = 250;
  const ZoomStep = 10;
  // Legacy namespace kept only for the one-time settings migration.
  const LegacyPrefix = 'mdview.';
  const Prefix = 'plainview.';

  function storageArea() {
    const api = root.browser ?? root.chrome;
    return api?.storage?.local ?? null;
  }

  async function loadSetting(key, fallback) {
    try {
      const area = storageArea();
      if (area) {
        const data = await area.get(key);
        if (data && data[key] !== undefined) {
          return data[key];
        }
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
        if (result && typeof result.catch === 'function') {
          result.catch(() => undefined);
        }
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
    return Themes.includes(value) ? value : null;
  }

  let migration = null;

  async function migrateChromeStorage() {
    try {
      const area = storageArea();
      if (!area) {
        return;
      }
      const all = await area.get(null);
      const updates = {};
      const removals = [];
      for (const [key, value] of Object.entries(all)) {
        if (!key.startsWith(LegacyPrefix)) {
          continue;
        }
        updates[Prefix + key.slice(LegacyPrefix.length)] = value;
        removals.push(key);
      }
      if (removals.length > 0) {
        await area.set(updates);
        await area.remove(removals);
      }
    } catch {
      /* keep the old keys if extension storage is unavailable */
    }
  }

  function migrateLocalStorage() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        keys.push(localStorage.key(i));
      }
      for (const key of keys) {
        if (!key?.startsWith(LegacyPrefix)) {
          continue;
        }
        localStorage.setItem(Prefix + key.slice(LegacyPrefix.length), localStorage.getItem(key));
        localStorage.removeItem(key);
      }
    } catch {
      /* localStorage is only a fallback */
    }
  }

  function migrateLegacySettings() {
    if (migration) {
      return migration;
    }
    migration = (async () => {
      await migrateChromeStorage();
      migrateLocalStorage();
    })();
    return migration;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    migrateLegacySettings,
    THEME_KEY: ThemeKey,
    ZOOM_KEY: ZoomKey,
    ZOOM_MIN: ZoomMin,
    ZOOM_MAX: ZoomMax,
    ZOOM_STEP: ZoomStep,
    loadSetting,
    saveSetting,
    validTheme,
  });
})(globalThis);
