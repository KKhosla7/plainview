/* global Plainview */
/*
 * Lazy enhancements and export actions. Enhancement failures are visible as a
 * state class instead of escaping as unhandled promise rejections.
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

  function exportHtml({ content, fileName, format, refreshExtras }) {
    return async () => {
      await refreshExtras();
      const uncompressed = await Plainview.loadSetting(Plainview.EXPORT_UNCOMPRESSED_KEY, false);
      await Plainview.exportHtml({
        article: content.article,
        fileName,
        format,
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

  function exportLabel(formatId, scope) {
    const label = String(formatId || 'data').toUpperCase();
    return scope === 'filtered'
      ? `Download filtered results (${label})`
      : `Download complete data (${label})`;
  }

  function createExportMenu({ topbar, content, fileName, format, refreshExtras }) {
    const menu = el('div', 'pv-export-menu');
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    const title = el('div', 'pv-export-menu-title', 'Export');
    const { formatId } = content.exportData;

    function close() {
      menu.hidden = true;
      topbar.exportButton.setAttribute('aria-expanded', 'false');
    }

    function open() {
      menu.replaceChildren(title);
      if (content.exportData.hasFilter()) {
        const filtered = el('button', '', exportLabel(formatId, 'filtered'));
        filtered.type = 'button';
        Plainview.onAsync(filtered, 'click', async () => {
          close();
          await exportNative(content, fileName, 'filtered')();
        });
        menu.append(filtered);
      }

      const complete = el('button', '', exportLabel(formatId, 'complete'));
      complete.type = 'button';
      Plainview.onAsync(complete, 'click', async () => {
        close();
        await exportNative(content, fileName, 'complete')();
      });
      const html = el('button', '', 'Download HTML page');
      html.type = 'button';
      Plainview.onAsync(html, 'click', async () => {
        close();
        await exportHtml({ content, fileName, format, refreshExtras })();
      });
      menu.append(complete, html);
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
    if (!content.exportData) {
      topbar.exportButton.title = 'Export a standalone HTML copy';
      Plainview.onAsync(topbar.exportButton, 'click', async () => {
        topbar.exportButton.disabled = true;
        topbar.exportButton.textContent = 'Exporting…';
        try {
          await exportHtml({ content, fileName, format, refreshExtras })();
        } finally {
          topbar.exportButton.disabled = false;
          topbar.exportButton.textContent = 'Export';
        }
      });
      return;
    }

    createExportMenu({ topbar, content, fileName, format, refreshExtras });
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createViewerEnhancements,
    wireViewerExport,
  });
})(globalThis);
