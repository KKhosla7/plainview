import { downloadText } from '../core/download.js';
import { createScrollTop } from './scroll-top.js';
import { wireShortcuts } from './shortcuts.js';
import { createViewerEnhancements, wireViewerExport } from './viewer-extras.js';

function wireViewerShell({
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
  shortcuts,
}) {
  const { refreshMermaid, refreshExtras } = createViewerEnhancements(content, theme);
  theme.setOnChange(refreshMermaid);
  topbar.downloadButton.addEventListener('click', () => {
    downloadText(source, fileName, format);
  });
  wireViewerExport({ topbar, refreshExtras, content, fileName, format });
  wireShortcuts({ viewSwitcher, zoom, toc, theme, topbar, app, shortcuts });
  if (viewSwitcher.getView() === 'source') {
    sourcePane.populate();
  }
  app.append(topbar.element, shell, sourcePane.element, zoom.element);
  createScrollTop({ app });
  return refreshExtras;
}

export { wireViewerShell };
