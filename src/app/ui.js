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
      return Plainview.buildJson(source);
    }

    if (format.id === 'yaml') {
      return Plainview.buildYaml(source);
    }

    if (format.id === 'toml') {
      return Plainview.buildToml(source);
    }

    if (format.id === 'csv') {
      return Plainview.buildCsv(source, format);
    }

    if (format.id === 'xml') {
      return Plainview.buildXml(source);
    }

    return Plainview.buildMarkdown(source);
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
      Plainview.scrollElementIntoViewInstant(target);
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
      Plainview.loadSetting(viewKey, 'html'),
      Plainview.loadSetting(scrollKey, null),
      Plainview.loadSetting(Plainview.THEME_KEY, null),
      Plainview.loadSetting(Plainview.ZOOM_KEY, 100),
      Plainview.loadSetting(Plainview.SHORTCUT_KEY, 'alt-s'),
      Plainview.loadSetting(Plainview.TABLE_BORDERS_KEY, false),
      Plainview.loadSetting(Plainview.TABLE_RESIZE_KEY, true),
      Plainview.loadSetting(Plainview.TABLE_LAYOUT_KEY, 'wrap'),
      Plainview.loadSetting(Plainview.JSON_TREE_MODE_KEY, 'virtual'),
    ]);
    return {
      viewKey,
      scrollKey,
      savedView: settings[0],
      savedScroll: settings[1],
      savedTheme: settings[2],
      savedZoom: settings[3],
      savedShortcuts: settings[4],
      savedTableBorders: settings[5],
      savedTableResize: settings[6],
      savedTableLayout: settings[7],
      savedJsonTreeMode: settings[8],
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
    const scrollMemory = Plainview.createScrollMemory({
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

  function watchTableSettings() {
    Plainview.watchSetting(Plainview.TABLE_BORDERS_KEY, (value) => {
      Plainview.tableBorders.apply(value);
    });
    Plainview.watchSetting(Plainview.TABLE_RESIZE_KEY, (value) => {
      Plainview.tableResize.apply(Boolean(value));
    });
    Plainview.watchSetting(Plainview.TABLE_LAYOUT_KEY, (value) => {
      Plainview.tableResize.applyLayout(Plainview.validTableLayout(value));
    });
    Plainview.watchSetting(Plainview.JSON_TREE_MODE_KEY, (value) => {
      const mode = value === 'classic' ? 'classic' : 'virtual';
      if (document.documentElement.dataset.pvJsonTreeMode !== mode) {
        location.reload();
      }
    });
  }

  async function mountViewer({ source, url, format, fileName: requestedName }) {
    await Plainview.migrateLegacySettings();
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
      savedJsonTreeMode,
    } = await loadViewerSettings(url);

    Plainview.tableBorders.apply(savedTableBorders);
    document.documentElement.dataset.pvTableResize = savedTableResize ? 'on' : 'off';
    document.documentElement.dataset.pvTableLayout = Plainview.validTableLayout(savedTableLayout);
    document.documentElement.dataset.pvJsonTreeMode =
      savedJsonTreeMode === 'classic' ? 'classic' : 'virtual';

    if (format.id === 'markdown') {
      Plainview.installFonts();
    }
    const content = await buildContent(source, format);
    const { app, topbar, sourcePane, shell, zoom, toc, viewSwitcher, theme } =
      Plainview.createViewerShell({
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

    const { refreshMermaid, refreshExtras } = Plainview.createViewerEnhancements(content, theme);
    theme.setOnChange(refreshMermaid);
    topbar.downloadButton.addEventListener('click', () => {
      Plainview.downloadText(source, fileName, format);
    });
    Plainview.wireViewerExport({ topbar, refreshExtras, content, fileName, format });
    const shortcutBindings = {
      viewSwitcher,
      zoom,
      toc,
      theme,
      topbar,
      app,
      shortcuts: savedShortcuts,
    };
    Plainview.wireShortcuts(shortcutBindings);

    if (viewSwitcher.getView() === 'source') {
      sourcePane.populate();
    }
    app.append(topbar.element, shell, sourcePane.element, zoom.element);

    Plainview.createScrollTop({ app });
    const sourceWatch = Plainview.watchSource({
      source,
      url,
      app,
      format,
      onReload: () => location.reload(),
    });
    globalThis.addEventListener('pagehide', () => sourceWatch.stop(), { once: true });

    applyDocumentChrome({ app, format, fileName });
    watchTableSettings();
    restoreScrollState({ scrollKey, savedScroll, viewSwitcher, toc, format, refreshExtras });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { mountViewer });
})(globalThis);
