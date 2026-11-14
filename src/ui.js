/* global MDView */
/*
 * Mounts the reader shell and wires the small UI controllers together.
 * Format-specific rendering lives in markdown-enhance.js, json-view.js and
 * xml-view.js.
 */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
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
    if (format.id === 'json') return MDView.buildJson(source);
    if (format.id === 'xml') return MDView.buildXml(source);
    return MDView.buildMarkdown(source);
  }

  function createSourcePane(source, format) {
    const pane = el('div', 'mdv-raw-pane');
    const head = el('div', 'mdv-raw-head');
    const label = el('div', 'mdv-raw-label', 'Original source');
    const copy = el('button', 'mdv-meta-button mdv-raw-copy', 'Copy source');
    copy.type = 'button';
    copy.title = 'Copy the original file text';
    copy.addEventListener('click', async () => {
      const ok = await MDView.copyText(source);
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(() => {
        copy.textContent = 'Copy source';
      }, 1200);
    });

    const pre = el('pre', 'mdv-raw-source');
    const code = el('code', 'mdv-raw-code');
    code.innerHTML = MDView.sourceHighlight.highlight(source, format.id);
    pre.append(code);

    head.append(label, copy);
    pane.append(head, pre);
    return pane;
  }

  function scrollToHash(format) {
    if (format.id !== 'markdown' || location.hash.length <= 1) return;
    let target = null;
    try {
      target = document.getElementById(
        decodeURIComponent(location.hash.slice(1)),
      );
    } catch {
      target = null;
    }
    if (target) MDView.scrollElementIntoViewInstant(target);
  }

  function wireShortcuts({ viewSwitcher, zoom, toc }) {
    const { ZOOM_STEP } = MDView;

    document.addEventListener(
      'wheel',
      (event) => {
        if (viewSwitcher.getView() !== 'html') return;
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        zoom.setZoom(
          zoom.getZoom() + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP),
        );
      },
      { passive: false },
    );

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (toc.isOpen()) toc.close();
        else if (viewSwitcher.getView() === 'source') {
          viewSwitcher.setView('html');
        }
        return;
      }

      if (viewSwitcher.getView() !== 'html') return;
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoom.setZoom(zoom.getZoom() + ZOOM_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        zoom.setZoom(zoom.getZoom() - ZOOM_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        zoom.setZoom(100);
      }
    });
  }

  function removeBrowserTextChrome() {
    for (const link of document.querySelectorAll('link[href]')) {
      if (link.href.startsWith('resource://content-accessible/plaintext.css')) {
        link.remove();
      }
    }
    for (const style of document.querySelectorAll(
      '#xml-viewer-style, #json-viewer-style',
    )) {
      style.remove();
    }
  }

  async function mountViewer({ source, url, format }) {
    const fileName = fileNameFromUrl(url);
    const viewKey = `mdview.view:${url}`;
    const scrollKey = `mdview.scroll:${url}`;

    const [savedView, savedScroll, savedTheme, savedZoom] = await Promise.all([
      MDView.loadSetting(viewKey, 'html'),
      MDView.loadSetting(scrollKey, null),
      MDView.loadSetting(MDView.THEME_KEY, null),
      MDView.loadSetting(MDView.ZOOM_KEY, 100),
    ]);

    if (format.id === 'markdown') MDView.installFonts();
    const content = buildContent(source, format);
    const app = el('div', 'mdv-app');
    const scrim = el('div', 'mdv-scrim');
    scrim.hidden = true;

    const topbar = MDView.createTopbar({
      fileName,
      url,
      formatLabel: format.label,
    });

    const shell = el('div', 'mdv-shell');
    const main = el('main', 'mdv-main');
    const zoomSurface = el('div', 'mdv-zoom-surface');
    zoomSurface.append(content.article);
    main.append(zoomSurface);

    const zoom = MDView.createZoom({ initialZoom: savedZoom });
    const toc = MDView.createTocDrawer({
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

    const viewSwitcher = MDView.createViewSwitcher({
      app,
      htmlTab: topbar.htmlTab,
      sourceTab: topbar.sourceTab,
      zoom,
      initialView: savedView,
      persistKey: viewKey,
      onSource: toc.close,
      onViewChange: () => {
        if (toc.update) toc.update();
      },
    });

    const theme = MDView.createTheme({
      lightButton: topbar.lightButton,
      darkButton: topbar.darkButton,
      initialTheme: savedTheme,
    });

    function refreshMermaid() {
      if (!content.mermaidBlocks || content.mermaidBlocks.length === 0) {
        return Promise.resolve();
      }
      return MDView.renderMermaidBlocks(content.mermaidBlocks, {
        isDark: theme.effectiveDark,
      });
    }
    theme.setOnChange(refreshMermaid);

    topbar.downloadButton.addEventListener('click', () => {
      MDView.downloadText(source, fileName, format);
    });
    wireShortcuts({ viewSwitcher, zoom, toc });

    app.append(
      topbar.element,
      shell,
      createSourcePane(source, format),
      zoom.element,
    );

    removeBrowserTextChrome();
    document.documentElement.dataset.mdvFormat = format.id;
    document.documentElement.dataset.mdv = 'active';
    document.body.replaceChildren(app);
    document.body.removeAttribute('style');
    if (fileName) document.title = fileName;

    const fallback = () => scrollToHash(format);
    const scrollMemory = MDView.createScrollMemory({
      key: scrollKey,
      initialY: savedScroll,
      onRestored: (y) => viewSwitcher.syncScroll(y),
    });

    scrollMemory.restore(fallback);
    if (toc.update) toc.update();
    refreshMermaid().then(() => {
      scrollMemory.reapply(fallback);
      if (toc.update) toc.update();
    });

    return { app, viewSwitcher, zoom, theme, scrollMemory };
  }

  root.MDView = Object.assign(root.MDView || {}, {
    mountViewer,
    fileNameFromUrl,
  });
})(globalThis);
