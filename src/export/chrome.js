import { createIconButton, icons } from '.././app/icons.js';
import { createTheme } from '.././app/theme.js';
import { tableResize } from '.././core/table-resize.js';

/* global Plainview */
/*
 * Standalone export chrome. It reuses the reader modules for theme, scroll,
 * table borders, table resizing and native data downloads.
 */
((root) => {
  const { document } = root;
  const ExportTableBordersPrefix = 'plainview.export.tableBorders:';
  const RevokeDelayMs = 10_000;

  function exportEntry(entry, total, close) {
    const format = entry.formatId === 'markdown' ? 'MD' : entry.formatId.toUpperCase();
    const text =
      total === 1
        ? `Download ${format}`
        : `${entry.scope === 'filtered' ? 'Download filtered' : 'Download complete'} ${format}`;
    const item = Plainview.createExportCell({
      ariaLabel: text,
      glyphLabel: format,
      label: text,
      title: text,
    });
    item.addEventListener('click', () => {
      const blob = new Blob([entry.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = entry.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      root.setTimeout(() => URL.revokeObjectURL(url), RevokeDelayMs);
      close();
    });
    return item;
  }

  function dataExportMenu(actions) {
    const node = document.querySelector('#pv-export-data');
    if (!node) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(node.textContent);
    } catch {
      return;
    }

    if (
      payload?.showDataMenu !== true ||
      !Array.isArray(payload.entries) ||
      payload.entries.length === 0
    ) {
      return;
    }

    const button = createIconButton(
      'pv-action pv-icon-action pv-export-data-action',
      'Export data',
      icons.export(),
    );
    const { menu, title } = Plainview.createMenuShell('Clean data');
    let controller;
    controller = Plainview.createMenuController({
      button,
      menu,
      onOpen() {
        menu.replaceChildren(title);
        for (const entry of payload.entries) {
          menu.append(exportEntry(entry, payload.entries.length, () => controller.close()));
        }
      },
    });
    actions.append(button, menu);
  }

  function init() {
    const topbar = document.querySelector('.pv-topbar');
    if (!topbar) {
      return;
    }

    const placeholder = topbar.querySelector('.pv-export-actions');
    const exportId = document.documentElement.dataset.pvExportId || location.pathname;
    const controls = Plainview.createTopbarActions({
      showDownload: false,
      showExport: false,
      showTableBorders: Boolean(document.querySelector('.pv-markdown table')),
      showToc: false,
      tableBordersKey: `${ExportTableBordersPrefix}${exportId}`,
    });
    if (placeholder) {
      placeholder.replaceWith(controls.actions);
    } else {
      topbar.append(controls.actions);
    }

    createTheme({
      button: controls.themeButton,
      initialTheme: document.documentElement.dataset.pvTheme,
    });
    dataExportMenu(controls.actions);

    tableResize.enableAll();

    const app = document.querySelector('.pv-app');
    if (app) {
      Plainview.createScrollTop({ app });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(globalThis);
