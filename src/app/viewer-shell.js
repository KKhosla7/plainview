/* global Plainview */
/*
 * Builds the reader shell: topbar, content surface, table of contents, view
 * switcher and theme controller.
 */
((root) => {
  const { el } = Plainview;

  function createViewerShell({
    content,
    format,
    fileName,
    url,
    viewKey,
    source,
    savedView,
    savedTheme,
    savedZoom,
  }) {
    const app = el('div', 'pv-app');
    const scrim = el('div', 'pv-scrim');
    scrim.hidden = true;

    const topbar = Plainview.createTopbar({
      fileName,
      url,
      formatLabel: format.label,
      showDownload: false,
      showTableBorders: format.id === 'markdown',
    });
    const sourcePane = Plainview.createSourcePane(source, format);
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
      onSource: () => {
        toc.close();
        sourcePane.populate();
      },
      onViewChange: () => {
        if (toc.update) {
          toc.update();
        }
      },
    });

    const theme = Plainview.createTheme({
      button: topbar.themeButton,
      initialTheme: savedTheme,
    });

    return { app, scrim, topbar, sourcePane, shell, zoom, toc, viewSwitcher, theme };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createViewerShell });
})(globalThis);
