/* global Plainview */
/*
 * Lazy enhancements and the export action. Enhancement failures are visible
 * as a state class instead of escaping as unhandled promise rejections.
 */
((root) => {
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

  function wireViewerExport({ topbar, refreshExtras, content, fileName, format }) {
    Plainview.onAsync(topbar.exportButton, 'click', async () => {
      topbar.exportButton.disabled = true;
      topbar.exportButton.textContent = 'Exporting…';
      try {
        await refreshExtras();
        const uncompressed = await Plainview.loadSetting(Plainview.EXPORT_UNCOMPRESSED_KEY, false);
        await Plainview.exportHtml({
          article: content.article,
          fileName,
          format,
          theme: document.documentElement.dataset.pvTheme || 'light',
          uncompressed: Boolean(uncompressed),
        });
      } finally {
        topbar.exportButton.disabled = false;
        topbar.exportButton.textContent = 'Export';
      }
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createViewerEnhancements,
    wireViewerExport,
  });
})(globalThis);
