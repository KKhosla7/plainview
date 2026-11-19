import { createTheme } from '.././app/theme.js';
import { createTopbar } from '../app/topbar.js';
import { el } from '../core/dom.js';
import { createSourcePane } from './source-pane.js';
import { createTocDrawer } from './toc.js';
import { createViewSwitcher } from './view-switcher.js';
import { createZoom } from './zoom.js';

function createSwitcher({ app, topbar, zoom, toc, sourcePane, viewKey, savedView }) {
  return createViewSwitcher({
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
      if (toc.element) {
        toc.update();
      }
    },
  });
}

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

  const topbar = createTopbar({
    fileName,
    url,
    formatLabel: format.label,
    showDownload: false,
    showTableBorders: format.id === 'markdown',
  });
  const sourcePane = createSourcePane(source, format);
  const shell = el('div', 'pv-shell');
  const main = el('main', 'pv-main');
  const zoomSurface = el('div', 'pv-zoom-surface');
  zoomSurface.append(content.article);
  main.append(zoomSurface);

  const zoom = createZoom({ initialZoom: savedZoom });
  const toc = createTocDrawer({
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

  const viewSwitcher = createSwitcher({
    app,
    topbar,
    zoom,
    toc,
    sourcePane,
    viewKey,
    savedView,
  });

  const theme = createTheme({
    button: topbar.themeButton,
    initialTheme: savedTheme,
  });

  return { app, scrim, topbar, sourcePane, shell, zoom, toc, viewSwitcher, theme };
}

export { createViewerShell };
