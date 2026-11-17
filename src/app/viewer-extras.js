/* global Plainview */
/*
 * Lazy enhancements and export actions. Enhancement failures are visible as a
 * state class instead of escaping as unhandled promise rejections.
 */
((root) => {
  const ExportErrorResetMs = 8000;

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

  function createViewerEnhancements(content, theme) {
    function refreshMermaid() {
      if (!content.mermaidBlocks || content.mermaidBlocks.length === 0) {
        return Promise.resolve();
      }

      return Plainview.renderMermaidBlocks(content.mermaidBlocks, {
        isDark: theme.effectiveDark,
      });
    }

    async function refreshExtras() {
      const results = await Promise.allSettled([
        refreshMermaid(),
        Plainview.renderMath(content.article, { enabled: content.math }),
        Plainview.highlightCodeBlocks(content.codeBlocks),
      ]);
      if (results.some((result) => result.status === 'rejected')) {
        content.article.classList.add('pv-enhancement-failed');
      }
    }

    return { refreshMermaid, refreshExtras };
  }

  function exportHtml({ content, fileName, format, refreshExtras, scope = 'complete' }) {
    return async () => {
      await refreshExtras();
      const uncompressed = await Plainview.loadSetting(Plainview.EXPORT_UNCOMPRESSED_KEY, false);
      await Plainview.exportHtml({
        article: content.article,
        exportData: content.exportData,
        fileName,
        format,
        scope,
        theme: document.documentElement.dataset.pvTheme || 'light',
        uncompressed: Boolean(uncompressed),
      });
    };
  }

  function exportNative(content, fileName, scope) {
    return async () => {
      await Plainview.dataExport.exportNative({
        exportData: content.exportData,
        scope,
        fileName,
      });
    };
  }

  function createExportFeedback(topbar) {
    const progress = el('div', 'pv-export-progress');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'Preparing export');
    progress.hidden = true;
    topbar.element.append(progress);

    function start() {
      topbar.exportButton.disabled = true;
      topbar.exportButton.setAttribute('aria-label', 'Exporting…');
      progress.hidden = false;
    }

    function finish() {
      topbar.exportButton.disabled = false;
      topbar.exportButton.setAttribute('aria-label', 'Export');
      progress.hidden = true;
    }

    function fail(error) {
      const message = error instanceof Error ? error.message : String(error);
      const notice = el('div', 'pv-export-error', `Export failed: ${message}`);
      notice.setAttribute('role', 'alert');
      document.body.append(notice);
      globalThis.setTimeout(() => notice.remove(), ExportErrorResetMs);
    }

    return {
      async run(task) {
        start();
        try {
          await task();
        } catch (error) {
          fail(error);
        } finally {
          finish();
        }
      },
    };
  }

  function exportGrid({
    action,
    content,
    fileName,
    format,
    formatLabel,
    hasFilter,
    refreshExtras,
  }) {
    const grid = el('div', 'pv-export-grid');
    if (hasFilter) {
      grid.append(
        el('span', 'pv-export-grid-label', 'Filtered Results'),
        action(
          formatLabel,
          `Download filtered results (${formatLabel})`,
          () => exportNative(content, fileName, 'filtered')(),
          'data',
        ),
        action(
          'HTML',
          'Download filtered HTML page',
          () => exportHtml({ content, fileName, format, refreshExtras, scope: 'filtered' })(),
          'html',
        ),
      );
    }
    grid.append(
      el('span', 'pv-export-grid-label', 'Complete Data'),
      action(
        formatLabel,
        `Download complete data (${formatLabel})`,
        () => exportNative(content, fileName, 'complete')(),
        'data',
      ),
      action(
        'HTML',
        hasFilter ? 'Download complete HTML page' : 'Download HTML page',
        () => exportHtml({ content, fileName, format, refreshExtras })(),
        'html',
      ),
    );
    return grid;
  }

  function createExportMenu({ feedback, topbar, content, fileName, format, refreshExtras }) {
    const menu = el('div', 'pv-export-menu');
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    const title = el('div', 'pv-export-menu-title', 'Export');
    const { formatId } = content.exportData;

    function close() {
      menu.hidden = true;
      topbar.exportButton.setAttribute('aria-expanded', 'false');
    }

    function action(label, ariaLabel, task, kind) {
      const button = el('button', 'pv-export-cell');
      button.type = 'button';
      button.setAttribute('aria-label', ariaLabel);
      button.title = `Download ${label}`;
      button.append(
        kind === 'html'
          ? Plainview.icons.html()
          : el('span', 'pv-format-glyph', Plainview.formatGlyph(label)),
        document.createTextNode(label),
      );
      Plainview.onAsync(button, 'click', async () => {
        close();
        await feedback.run(task);
      });
      return button;
    }

    function open() {
      menu.replaceChildren(title);
      const grid = exportGrid({
        action,
        content,
        fileName,
        format,
        formatLabel: String(format?.label || formatId || 'data').toUpperCase(),
        hasFilter: content.exportData.hasFilter(),
        refreshExtras,
      });
      menu.append(grid);
      menu.hidden = false;
      topbar.exportButton.setAttribute('aria-expanded', 'true');
      menu.querySelector('button')?.focus();
    }

    topbar.exportButton.setAttribute('aria-haspopup', 'menu');
    topbar.exportButton.setAttribute('aria-expanded', 'false');
    topbar.exportButton.title = 'Export data or standalone HTML';
    topbar.exportButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (menu.hidden) {
        open();
      } else {
        close();
      }
    });
    menu.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        close();
        topbar.exportButton.focus();
      }
    });
    topbar.exportButton.parentElement.append(menu);
    return { close };
  }

  function wireViewerExport({ topbar, refreshExtras, content, fileName, format }) {
    const feedback = createExportFeedback(topbar);
    if (!content.exportData) {
      topbar.exportButton.title = 'Export a standalone HTML copy';
      Plainview.onAsync(topbar.exportButton, 'click', async () => {
        await feedback.run(() => exportHtml({ content, fileName, format, refreshExtras })());
      });
      return;
    }

    createExportMenu({ feedback, topbar, content, fileName, format, refreshExtras });
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createViewerEnhancements,
    wireViewerExport,
  });
})(globalThis);
