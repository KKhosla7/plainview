import { installFonts } from '../core/fonts.js';
import { validTableLayout } from '../core/settings.js';
import { tableBorders } from './table-border-toggle.js';
import { loadViewerSettings } from './viewer-settings.js';

const DEFAULT_CONTENT_FONT_SIZE = 12;

async function loadAndApplySettings({ url, format }) {
  const settings = await loadViewerSettings(url);
  const {
    savedContentFontSize,
    savedFormatValues,
    savedIndentGuides,
    savedTableBorders,
    savedTableResize,
    savedTableLayout,
    savedJsonTreeMode,
  } = settings;
  applyTreeFont(savedContentFontSize, savedFormatValues, savedIndentGuides);
  tableBorders.apply(savedTableBorders);
  document.documentElement.dataset.pvTableResize = savedTableResize ? 'on' : 'off';
  document.documentElement.dataset.pvTableLayout = validTableLayout(savedTableLayout);
  if (format.id === 'markdown') {
    installFonts();
  }
  document.documentElement.dataset.pvJsonTreeMode =
    savedJsonTreeMode === 'classic' ? 'classic' : 'virtual';
  return settings;
}

function applyTreeFont(value, formatValues, indentGuides) {
  document.documentElement.style.setProperty(
    '--pv-tree-font-size',
    `${Number(value) || DEFAULT_CONTENT_FONT_SIZE}px`,
  );
  document.documentElement.dataset.pvFormatValues = formatValues ? 'on' : 'off';
  document.documentElement.dataset.pvIndentGuides = indentGuides ? 'on' : 'off';
}

export { loadAndApplySettings };
