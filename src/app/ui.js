/* global Plainview */
/*
 * Mounts the reader shell and wires the small UI controllers together.
 * Format-specific rendering lives in src/formats/.
 */
((root) => {
  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

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
    if (format.id === 'xml') {
      return Plainview.buildXml(source);
    }
    return Plainview.buildMarkdown(source);
  }

  function createSourcePane(source, format) {
    const pane = el('div', 'pv-raw-pane');
    const head = el('div', 'pv-raw-head');
    const label = el('div', 'pv-raw-label', 'Original source');
    const copy = el('button', 'pv-meta-button pv-raw-copy', 'Copy source');
    copy.type = 'button';
    copy.title = 'Copy the original file text';
    copy.addEventListener('click', async () => {
      const ok = await Plainview.copyText(source);
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(() => {
        copy.textContent = 'Copy source';
      }, 1200);
    });

    const pre = el('pre', 'pv-raw-source');
    const code = el('code', 'pv-raw-code');
    code.innerHTML = Plainview.sourceHighlight.highlight(source, format.id);
    pre.append(code);

    head.append(label, copy);
    pane.append(head, pre);
    return pane;
  }

  function scrollToHash(format) {
    if (format.id !== 'markdown' || location.hash.length <= 1) {
      return;
    }
    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      target = null;
    }
    if (target) {
      Plainview.scrollElementIntoViewInstant(target);
    }
  }

  function wireShortcuts({ viewSwitcher, zoom, toc }) {
    const { ZOOM_STEP } = Plainview;

    document.addEventListener(
      'wheel',
      (event) => {
        if (viewSwitcher.getView() !== 'html') {
          return;
        }
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }
        event.preventDefault();
        zoom.setZoom(zoom.getZoom() + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
      },
      { passive: false },
    );

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        handleEscape(viewSwitcher, toc);
        return;
      }
      handleZoomKey(event, viewSwitcher, zoom, ZOOM_STEP);
    });
  }

  function handleEscape(viewSwitcher, toc) {
    if (toc.isOpen()) {
      toc.close();
      return;
    }
    if (viewSwitcher.getView() === 'source') {
      viewSwitcher.setView('html');
    }
  }

  function handleZoomKey(event, viewSwitcher, zoom, step) {
    if (viewSwitcher.getView() !== 'html' || !(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom.setZoom(zoom.getZoom() + step);
    } else if (event.key === '-') {
      event.preventDefault();
      zoom.setZoom(zoom.getZoom() - step);
    } else if (event.key === '0') {
      event.preventDefault();
      zoom.setZoom(100);
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

  async function mountViewer({ source, url, format }) {
    await Plainview.migrateLegacySettings();
    const fileName = fileNameFromUrl(url);
    const viewKey = `plainview.view:${url}`;
    const scrollKey = `plainview.scroll:${url}`;

    const [savedView, savedScroll, savedTheme, savedZoom] = await Promise.all([
      Plainview.loadSetting(viewKey, 'html'),
      Plainview.loadSetting(scrollKey, null),
      Plainview.loadSetting(Plainview.THEME_KEY, null),
      Plainview.loadSetting(Plainview.ZOOM_KEY, 100),
    ]);

    if (format.id === 'markdown') {
      Plainview.installFonts();
    }
    const content = buildContent(source, format);
    const app = el('div', 'pv-app');
    const scrim = el('div', 'pv-scrim');
    scrim.hidden = true;

    const topbar = Plainview.createTopbar({
      fileName,
      url,
      formatLabel: format.label,
    });

    const shell = el('div', 'pv-shell');
    const main = el('main', 'pv-main');
    const zoomSurface = el('div', 'pv-zoom-surface');
    zoomSurface.append(content.article);
    main.append(zoomSurface);

    const zoom = Plainview.createZoom({ initialZoom: savedZoom });
    const toc = Plainview.createTocDrawer({
      headings: content.headings,
      button: topbar.tocButton,
      app,
      scrim,
    });

    if (toc.element) {
      shell.append(toc.element);
      app.append(scrim);
    }
    shell.append(main);

    const viewSwitcher = Plainview.createViewSwitcher({
      app,
      htmlTab: topbar.htmlTab,
      sourceTab: topbar.sourceTab,
      zoom,
      initialView: savedView,
      persistKey: viewKey,
      onSource: toc.close,
      onViewChange: () => {
        if (toc.update) {
          toc.update();
        }
      },
    });

    const theme = Plainview.createTheme({
      lightButton: topbar.lightButton,
      darkButton: topbar.darkButton,
      initialTheme: savedTheme,
    });

    function refreshMermaid() {
      if (!content.mermaidBlocks || content.mermaidBlocks.length === 0) {
        return Promise.resolve();
      }
      return Plainview.renderMermaidBlocks(content.mermaidBlocks, {
        isDark: theme.effectiveDark,
      });
    }
    theme.setOnChange(refreshMermaid);

    topbar.downloadButton.addEventListener('click', () => {
      Plainview.downloadText(source, fileName, format);
    });
    wireShortcuts({ viewSwitcher, zoom, toc });

    app.append(topbar.element, shell, createSourcePane(source, format), zoom.element);

    removeBrowserTextChrome();
    document.documentElement.dataset.pvFormat = format.id;
    document.documentElement.dataset.pv = 'active';
    document.body.replaceChildren(app);
    document.body.removeAttribute('style');
    if (fileName) {
      document.title = fileName;
    }

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
    refreshMermaid().then(() => {
      scrollMemory.reapply(fallback);
      if (toc.update) {
        toc.update();
      }
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { mountViewer });
})(globalThis);
