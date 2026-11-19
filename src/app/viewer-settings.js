import {
  CONTENT_FONT_SIZE_KEY,
  FORMAT_VALUES_KEY,
  INDENT_GUIDES_KEY,
  JSON_TREE_MODE_KEY,
  loadSetting,
  SHORTCUT_KEY,
  TABLE_BORDERS_KEY,
  TABLE_LAYOUT_KEY,
  TABLE_RESIZE_KEY,
  THEME_KEY,
  ZOOM_KEY,
} from '../core/settings.js';

const DEFAULT_ZOOM = 100;
const DEFAULT_CONTENT_FONT_SIZE = 12;

async function loadViewerSettings(url) {
  const viewKey = `plainview.view:${url}`;
  const scrollKey = `plainview.scroll:${url}`;
  const [
    savedView,
    savedScroll,
    savedTheme,
    savedZoom,
    savedShortcuts,
    savedTableBorders,
    savedContentFontSize,
    savedFormatValues,
    savedIndentGuides,
    savedTableResize,
    savedTableLayout,
    savedJsonTreeMode,
  ] = await Promise.all([
    loadSetting(viewKey, 'html'),
    loadSetting(scrollKey, null),
    loadSetting(THEME_KEY, null),
    loadSetting(ZOOM_KEY, DEFAULT_ZOOM),
    loadSetting(SHORTCUT_KEY, 'alt-s'),
    loadSetting(TABLE_BORDERS_KEY, false),
    loadSetting(CONTENT_FONT_SIZE_KEY, DEFAULT_CONTENT_FONT_SIZE),
    loadSetting(FORMAT_VALUES_KEY, true),
    loadSetting(INDENT_GUIDES_KEY, true),
    loadSetting(TABLE_RESIZE_KEY, true),
    loadSetting(TABLE_LAYOUT_KEY, 'wrap'),
    loadSetting(JSON_TREE_MODE_KEY, 'virtual'),
  ]);
  return {
    viewKey,
    scrollKey,
    savedView,
    savedScroll,
    savedTheme,
    savedZoom,
    savedShortcuts,
    savedContentFontSize,
    savedFormatValues,
    savedIndentGuides,
    savedTableBorders,
    savedTableResize,
    savedTableLayout,
    savedJsonTreeMode,
  };
}

export { loadViewerSettings };
