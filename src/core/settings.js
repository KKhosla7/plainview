/* global Plainview */
((root) => {
  const Keys = Plainview.SETTING_KEYS;
  const ThemeKey = Keys.Theme;
  const ZoomKey = Keys.Zoom;
  const ShortcutKey = Keys.Shortcuts;
  const {
    ContentFontSize: ContentFontSizeKey,
    ExportDataMenu: ExportDataMenuKey,
    ExportUncompressed: ExportUncompressedKey,
    FormatValues: FormatValuesKey,
  } = Keys;
  const TableBordersKey = Keys.TableBorders;
  const TableResizeKey = Keys.TableResize;
  const ZoomMin = 50;
  const ZoomMax = 250;
  const ZoomStep = 10;
  const LegacyPrefix = Plainview.LEGACY_SETTING_PREFIX;
  const Prefix = Plainview.SETTING_PREFIX;

  function storageArea() {
    const api = root.browser ?? root.chrome;
    return api?.storage?.local ?? null;
  }

  function loadLocalSetting(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return fallback;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch {
      return fallback;
    }
  }

  function saveLocalSetting(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
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
      return loadLocalSetting(key, fallback);
    }

    return loadLocalSetting(key, fallback);
  }

  function watchSetting(key, onChange) {
    const api = root.browser ?? root.chrome;
    try {
      api?.storage?.onChanged?.addListener((changes, area) => {
        if (area !== 'local' || !changes?.[key]) {
          return;
        }
        onChange(changes[key].newValue);
      });
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  function saveSetting(key, value) {
    try {
      const area = storageArea();
      if (area) {
        const result = area.set({ [key]: value });
        if (result && typeof result.catch === 'function') {
          result.then(
            () => true,
            () => false,
          );
        }

        return true;
      }
    } catch {
      return saveLocalSetting(key, value);
    }

    return saveLocalSetting(key, value);
  }

  function validTheme(value) {
    return ['light', 'dark'].includes(value) ? value : null;
  }

  function validTableLayout(value) {
    return value === 'scroll' ? 'scroll' : 'wrap';
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
      return false;
    }

    return true;
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
      return false;
    }

    return true;
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
    CONTENT_FONT_SIZE_KEY: ContentFontSizeKey,
    THEME_KEY: ThemeKey,
    ZOOM_KEY: ZoomKey,
    SHORTCUT_KEY: ShortcutKey,
    FORMAT_VALUES_KEY: FormatValuesKey,
    EXPORT_DATA_MENU_KEY: ExportDataMenuKey,
    EXPORT_UNCOMPRESSED_KEY: ExportUncompressedKey,
    TABLE_BORDERS_KEY: TableBordersKey,
    TABLE_RESIZE_KEY: TableResizeKey,
    TABLE_LAYOUT_KEY: Keys.TableLayout,
    JSON_TREE_MODE_KEY: Keys.JsonTreeMode,
    ZOOM_MIN: ZoomMin,
    ZOOM_MAX: ZoomMax,
    ZOOM_STEP: ZoomStep,
    loadSetting,
    saveSetting,
    watchSetting,
    validTheme,
    validTableLayout,
  });
})(globalThis);
