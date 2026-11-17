/* global Plainview */
/*
 * Standalone export chrome. It reuses the reader modules for theme, scroll,
 * table borders, table resizing and native data downloads.
 */
((root) => {
  const { document } = root;
  const RevokeDelayMs = 10_000;

  function iconButton(className, label, iconNode) {
    const button = Plainview.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(iconNode);
    return button;
  }

  function exportEntry(entry, total, close) {
    const item = Plainview.createElement('button');
    item.type = 'button';
    item.className = 'pv-export-cell';
    const format = entry.formatId === 'markdown' ? 'MD' : entry.formatId.toUpperCase();
    const glyph = Plainview.createElement('span');
    glyph.className = 'pv-format-glyph';
    glyph.textContent = Plainview.formatGlyph(format);
    const text =
      total === 1
        ? `Download ${format}`
        : `${entry.scope === 'filtered' ? 'Download filtered' : 'Download complete'} ${format}`;
    item.append(glyph, document.createTextNode(text));
    item.title = text;
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

    if (!(payload && Array.isArray(payload.entries)) || payload.entries.length === 0) {
      return;
    }

    const button = iconButton(
      'pv-action pv-icon-action pv-export-data-action',
      'Export data',
      Plainview.icons.export(),
    );
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    const menu = Plainview.createElement('div');
    menu.className = 'pv-export-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    const title = Plainview.createElement('div');
    title.className = 'pv-export-menu-title';
    title.textContent = 'Clean data';
    menu.append(title);

    function close() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }

    for (const entry of payload.entries) {
      menu.append(exportEntry(entry, payload.entries.length, close));
    }

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        close();
      }
    });
    actions.append(button, menu);
  }

  function init() {
    const topbar = document.querySelector('.pv-topbar');
    if (!topbar) {
      return;
    }

    let actions = topbar.querySelector('.pv-export-actions');
    if (!actions) {
      actions = Plainview.createElement('div');
      actions.className = 'pv-actions pv-export-actions';
      topbar.append(actions);
    }

    const themeButton = iconButton(
      'pv-action pv-icon-action pv-theme-toggle',
      'Toggle theme',
      Plainview.icons.theme(),
    );
    Plainview.createTheme({
      button: themeButton,
      initialTheme: document.documentElement.dataset.pvTheme,
    });
    actions.append(themeButton);

    if (document.querySelector('.pv-markdown table')) {
      const borderButton = iconButton(
        'pv-action pv-icon-action pv-table-borders-toggle',
        'Show column lines',
        Plainview.icons.table(),
      );
      Plainview.createTableBordersToggle({ button: borderButton });
      actions.append(borderButton);
    }

    dataExportMenu(actions);

    let index = 0;
    for (const table of document.querySelectorAll('.pv-markdown .pv-table-wrap table')) {
      Plainview.tableResize.enable(table, {
        offset: 0,
        tableId: table.dataset.pvTableId || `markdown-${index}`,
      });
      index += 1;
    }

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
