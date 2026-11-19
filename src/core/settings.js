import { LEGACY_SETTING_PREFIX, SETTING_KEYS, SETTING_PREFIX } from './setting-keys.js';

const Keys = SETTING_KEYS;
const ThemeKey = Keys.Theme;
const ZoomKey = Keys.Zoom;
const ShortcutKey = Keys.Shortcuts;
const ContentFontSizeKey = Keys.ContentFontSize;
const ExportDataMenuKey = Keys.ExportDataMenu;
const ExportUncompressedKey = Keys.ExportUncompressed;
const FormatValuesKey = Keys.FormatValues;
const IndentGuidesKey = Keys.IndentGuides;
const TableBordersKey = Keys.TableBorders;
const TableResizeKey = Keys.TableResize;
const ZOOM_MIN_VALUE = 50;
const ZOOM_MAX_VALUE = 250;
const ZOOM_STEP_VALUE = 10;
const LegacyPrefix = LEGACY_SETTING_PREFIX;
const Prefix = SETTING_PREFIX;
const CONTENT_FONT_SIZE_KEY = ContentFontSizeKey;
const THEME_KEY = ThemeKey;
const ZOOM_KEY = ZoomKey;
const SHORTCUT_KEY = ShortcutKey;
const FORMAT_VALUES_KEY = FormatValuesKey;
const INDENT_GUIDES_KEY = IndentGuidesKey;
const EXPORT_DATA_MENU_KEY = ExportDataMenuKey;
const EXPORT_UNCOMPRESSED_KEY = ExportUncompressedKey;
const TABLE_BORDERS_KEY = TableBordersKey;
const TABLE_RESIZE_KEY = TableResizeKey;
const TABLE_LAYOUT_KEY = Keys.TableLayout;
const JSON_TREE_MODE_KEY = Keys.JsonTreeMode;
const ZOOM_MIN = ZOOM_MIN_VALUE;
const ZOOM_MAX = ZOOM_MAX_VALUE;
const ZOOM_STEP = ZOOM_STEP_VALUE;

function storageArea() {
  const api = globalThis.browser ?? globalThis.chrome;
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
  const api = globalThis.browser ?? globalThis.chrome;
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

export {
  CONTENT_FONT_SIZE_KEY,
  EXPORT_DATA_MENU_KEY,
  EXPORT_UNCOMPRESSED_KEY,
  FORMAT_VALUES_KEY,
  INDENT_GUIDES_KEY,
  JSON_TREE_MODE_KEY,
  loadSetting,
  migrateLegacySettings,
  SHORTCUT_KEY,
  saveSetting,
  TABLE_BORDERS_KEY,
  TABLE_LAYOUT_KEY,
  TABLE_RESIZE_KEY,
  THEME_KEY,
  validTableLayout,
  validTheme,
  watchSetting,
  ZOOM_KEY,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
};
