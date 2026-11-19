import { downloadText } from '../core/download.js';
import { installFonts } from '../core/fonts.js';
import { createScrollMemory } from '.././core/scroll-memory.js';
import { scrollElementIntoViewInstant } from '.././core/scroll-utils.js';
import {
  CONTENT_FONT_SIZE_KEY,
  FORMAT_VALUES_KEY,
  INDENT_GUIDES_KEY,
  loadSetting,
  migrateLegacySettings,
  SHORTCUT_KEY,
  TABLE_BORDERS_KEY,
  TABLE_LAYOUT_KEY,
  TABLE_RESIZE_KEY,
  THEME_KEY,
  validTableLayout,
  watchSetting,
  ZOOM_KEY,
} from '../core/settings.js';
import { watchSource } from '../core/source-watch.js';
import { tableResize } from '.././core/table-resize.js';
import { buildCsv } from '../formats/csv/view.js';
import { buildJson } from '../formats/json/view.js';
import { buildLogs } from '../formats/logs-view.js';
import { buildMarkdown } from '../formats/markdown/enhance.js';
import { buildToml } from '../formats/toml/view.js';
import { buildXml } from '../formats/xml/view.js';
import { buildYaml } from '../formats/yaml/view.js';
import { focusSnapshot, restoreFocus } from './focus.js';
import { createScrollTop } from './scroll-top.js';
import { wireShortcuts } from './shortcuts.js';
import { tableBorders } from './table-border-toggle.js';
import { createViewerEnhancements, wireViewerExport } from './viewer-extras.js';
import { createViewerShell } from './viewer-shell.js';

/* global Plainview */
/*
 * Mounts the reader shell and wires the small UI controllers together.
 * Format-specific rendering lives in src/formats/.
 */
((root) => {
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

  async function loadViewerSettings(url) {
    const viewKey = `plainview.view:${url}`;
    const scrollKey = `plainview.scroll:${url}`;
    const settings = await Promise.all([
      loadSetting(viewKey, 'html'),
      loadSetting(scrollKey, null),
      loadSetting(THEME_KEY, null),
      loadSetting(ZOOM_KEY, 100),
      loadSetting(SHORTCUT_KEY, 'alt-s'),
      loadSetting(TABLE_BORDERS_KEY, false),
      loadSetting(CONTENT_FONT_SIZE_KEY, 12),
      loadSetting(FORMAT_VALUES_KEY, true),
      loadSetting(INDENT_GUIDES_KEY, true),
      loadSetting(TABLE_RESIZE_KEY, true),
      loadSetting(TABLE_LAYOUT_KEY, 'wrap'),
    ]);
    return {
      viewKey,
      scrollKey,
      savedView: settings[0],
      savedScroll: settings[1],
      savedTheme: settings[2],
      savedZoom: settings[3],
      savedShortcuts: settings[4],
      savedContentFontSize: settings[6],
      savedFormatValues: settings[7],
      savedIndentGuides: settings[8],
      savedTableBorders: settings[5],
      savedTableResize: settings[9],
      savedTableLayout: settings[10],
    };
  }
  function restoreScrollState({
    scrollKey,
    savedScroll,
    viewSwitcher,
    toc,
    format,
    refreshExtras,
  }) {
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
    document.documentElement.style.setProperty('--pv-tree-font-size', `${Number(value) || 12}px`);
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
    Plainview.mountViewer({ source, url, format })
      .then(() => restoreFocus(snapshot))
      .catch(() => location.reload());
  }

  async function mountViewer({ source, url, format, fileName: requestedName }) {
    await migrateLegacySettings();
    const fileName = requestedName || fileNameFromUrl(url);
    const {
      viewKey,
      scrollKey,
      savedView,
      savedScroll,
      savedTheme,
      savedZoom,
      savedShortcuts,
      savedTableBorders,
      savedTableResize,
      savedTableLayout,
      savedContentFontSize,
      savedFormatValues,
      savedIndentGuides,
    } = await loadViewerSettings(url);

    applyTreeFont(savedContentFontSize, savedFormatValues, savedIndentGuides);
    tableBorders.apply(savedTableBorders);
    document.documentElement.dataset.pvTableResize = savedTableResize ? 'on' : 'off';
    document.documentElement.dataset.pvTableLayout = validTableLayout(savedTableLayout);

    if (format.id === 'markdown') {
      installFonts();
    }
    const content = await buildContent(source, format);
    const { app, topbar, sourcePane, shell, zoom, toc, viewSwitcher, theme } = createViewerShell({
      content,
      format,
      fileName,
      url,
      viewKey,
      source,
      savedView,
      savedTheme,
      savedZoom,
    });

    const { refreshMermaid, refreshExtras } = createViewerEnhancements(content, theme);
    theme.setOnChange(refreshMermaid);
    topbar.downloadButton.addEventListener('click', () => {
      downloadText(source, fileName, format);
    });
    wireViewerExport({ topbar, refreshExtras, content, fileName, format });
    const shortcutBindings = {
      viewSwitcher,
      zoom,
      toc,
      theme,
      topbar,
      app,
      shortcuts: savedShortcuts,
    };
    wireShortcuts(shortcutBindings);

    if (viewSwitcher.getView() === 'source') {
      sourcePane.populate();
    }
    app.append(topbar.element, shell, sourcePane.element, zoom.element);

    createScrollTop({ app });
    const sourceWatch = watchSource({
      source,
      url,
      app,
      format,
      onReload: () => location.reload(),
      onUpdate: (nextSource) => refreshViewer(nextSource, location.href, format),
    });
    globalThis.addEventListener('pagehide', () => sourceWatch.stop(), { once: true });

    applyDocumentChrome({ app, format, fileName });
    watchTableSettings();
    restoreScrollState({ scrollKey, savedScroll, viewSwitcher, toc, format, refreshExtras });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { mountViewer });
})(globalThis);
