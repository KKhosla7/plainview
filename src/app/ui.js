import { createScrollMemory } from '.././core/scroll-memory.js';
import { scrollElementIntoViewInstant } from '.././core/scroll-utils.js';
import {
  CONTENT_FONT_SIZE_KEY,
  FORMAT_VALUES_KEY,
  INDENT_GUIDES_KEY,
  migrateLegacySettings,
  TABLE_BORDERS_KEY,
  TABLE_LAYOUT_KEY,
  TABLE_RESIZE_KEY,
  validTableLayout,
  watchSetting,
} from '../core/settings.js';

import { tableResize } from '.././core/table-resize.js';
import { buildCsv } from '../formats/csv/view.js';
import { buildJson } from '../formats/json/view.js';
import { buildLogs } from '../formats/logs-view.js';
import { buildMarkdown } from '../formats/markdown/enhance.js';
import { buildToml } from '../formats/toml/view.js';
import { buildXml } from '../formats/xml/view.js';
import { buildYaml } from '../formats/yaml/view.js';
import { focusSnapshot, restoreFocus } from './focus.js';
import { tableBorders } from './table-border-toggle.js';
import { loadAndApplySettings } from './viewer-settings-loader.js';
import { createViewerShell } from './viewer-shell.js';
import { wireViewerShell } from './viewer-shell-wiring.js';
import { startSourceWatch } from './viewer-watch.js';

const DEFAULT_CONTENT_FONT_SIZE = 12;

function fileNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : parsed.hostname || 'Document';
  } catch {
    return 'Document';
  }
}

function buildContent(source, format) {
  if (format.id === 'json') {
    return buildJson(source);
  }

  if (format.id === 'swagger') {
    return source.trimStart().startsWith('{') ? buildJson(source) : buildYaml(source);
  }

  if (format.id === 'logs') {
    return buildLogs(source);
  }

  if (format.id === 'yaml') {
    return buildYaml(source);
  }

  if (format.id === 'toml') {
    return buildToml(source);
  }

  if (format.id === 'csv') {
    return buildCsv(source, format);
  }

  if (format.id === 'xml') {
    return buildXml(source);
  }

  return buildMarkdown(source);
}

function scrollToHash(format) {
  if (format.id !== 'markdown' || location.hash.length <= 1) {
    return;
  }
  let target = null;
  try {
    target = document.querySelector(
      `[id=${JSON.stringify(decodeURIComponent(location.hash.slice(1)))}]`,
    );
  } catch {
    target = null;
  }

  if (target) {
    scrollElementIntoViewInstant(target);
  }
}

function removeBrowserTextChrome() {
  for (const link of document.querySelectorAll('link[href]')) {
    if (link.href.startsWith('resource://content-accessible/plaintext.css')) {
      link.remove();
    }
  }

  for (const style of document.querySelectorAll('#xml-viewer-style, #json-viewer-style')) {
    style.remove();
  }
}

function applyDocumentChrome({ app, format, fileName }) {
  removeBrowserTextChrome();
  document.documentElement.dataset.pvFormat = format.id;
  document.documentElement.dataset.pv = 'active';
  document.body.replaceChildren(app);
  document.body.removeAttribute('style');
  if (fileName) {
    document.title = fileName;
  }
}

function restoreScrollState({ scrollKey, savedScroll, viewSwitcher, toc, format, refreshExtras }) {
  const fallback = () => scrollToHash(format);
  const scrollMemory = createScrollMemory({
    key: scrollKey,
    initialY: savedScroll,
    onRestored: (y) => viewSwitcher.syncScroll(y),
  });
  scrollMemory.restore(fallback);
  if (toc.update) {
    toc.update();
  }
  refreshExtras().then(() => {
    scrollMemory.reapply(fallback);
    if (toc.update) {
      toc.update();
    }
  });
}

function applyTreeFont(value, formatValues, indentGuides) {
  document.documentElement.style.setProperty(
    '--pv-tree-font-size',
    `${Number(value) || DEFAULT_CONTENT_FONT_SIZE}px`,
  );
  document.documentElement.dataset.pvFormatValues = formatValues ? 'on' : 'off';
  document.documentElement.dataset.pvIndentGuides = indentGuides ? 'on' : 'off';
}

function watchTableSettings() {
  watchSetting(FORMAT_VALUES_KEY, (value) => {
    document.documentElement.dataset.pvFormatValues = value ? 'on' : 'off';
  });
  watchSetting(INDENT_GUIDES_KEY, (value) => {
    document.documentElement.dataset.pvIndentGuides = value ? 'on' : 'off';
  });
  watchSetting(TABLE_BORDERS_KEY, (value) => {
    tableBorders.apply(value);
  });
  watchSetting(TABLE_RESIZE_KEY, (value) => {
    tableResize.apply(Boolean(value));
  });
  watchSetting(TABLE_LAYOUT_KEY, (value) => {
    tableResize.applyLayout(validTableLayout(value));
  });
  watchSetting(CONTENT_FONT_SIZE_KEY, applyTreeFont);
}

function refreshViewer(source, url, format) {
  const snapshot = focusSnapshot();
  mountViewer({ source, url, format })
    .then(() => restoreFocus(snapshot))
    .catch(() => location.reload());
}

async function mountViewer({ source, url, format, fileName: requestedName }) {
  await migrateLegacySettings();
  const fileName = requestedName || fileNameFromUrl(url);
  const settings = await loadAndApplySettings({ url, format, fileName });
  const content = await buildContent(source, format);
  const { app, topbar, sourcePane, shell, zoom, toc, viewSwitcher, theme } = createViewerShell({
    content,
    format,
    fileName,
    url,
    viewKey: settings.viewKey,
    source,
    savedView: settings.savedView,
    savedTheme: settings.savedTheme,
    savedZoom: settings.savedZoom,
  });
  const refreshExtras = wireViewerShell({
    app,
    topbar,
    sourcePane,
    shell,
    zoom,
    toc,
    viewSwitcher,
    theme,
    content,
    source,
    fileName,
    format,
    shortcuts: settings.savedShortcuts,
  });
  startSourceWatch({
    source,
    url,
    app,
    format,
    onUpdate: (nextSource) => refreshViewer(nextSource, location.href, format),
  });
  applyDocumentChrome({ app, format, fileName });
  watchTableSettings();
  restoreScrollState({
    scrollKey: settings.scrollKey,
    savedScroll: settings.savedScroll,
    viewSwitcher,
    toc,
    format,
    refreshExtras,
  });
}

export { mountViewer };
