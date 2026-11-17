/* global Plainview */
import CompressedTemplate from './export/compressed.html';
import DecompressTemplate from './export/decompress.txt';
import DocumentTemplate from './export/document.html';

/*
 * Export the current rendered article as one standalone HTML file. The clone is
 * made from the already-sanitized DOM, and the reader stylesheet is inlined.
 * KaTeX fonts are only embedded when the document actually contains math.
 */
((root) => {
  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/gu, (char) => {
      const escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return escapes[char];
    });
  }

  function fillTemplate(template, values) {
    return template.replace(/\{\{([A-Z_]+)\}\}/gu, (_match, key) => String(values[key] ?? ''));
  }

  function cloneForExport(sourceRoot) {
    const clone = sourceRoot.cloneNode(true);
    for (const selector of [
      '.pv-doc-meta',
      '.pv-json-tools',
      '.pv-code-bar',
      '.pv-mermaid-tools',
      '.pv-json-path',
      '.pv-anchor',
      '.pv-copy',
      '.pv-table-resize',
      'button',
      'input',
      'form',
      'script',
      'link',
    ]) {
      for (const node of clone.querySelectorAll(selector)) {
        node.remove();
      }
    }

    for (const table of clone.querySelectorAll('table')) {
      delete table.dataset.pvResizable;
    }

    for (const link of clone.querySelectorAll('.pv-toc-link')) {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }

    return clone;
  }

  function cloneTopbar() {
    const topbar = document.querySelector('.pv-topbar');
    if (!topbar) {
      return '';
    }
    const clone = topbar.cloneNode(true);
    for (const node of clone.querySelectorAll(
      '.pv-views, .pv-actions, .pv-export-progress, .pv-export-error',
    )) {
      node.remove();
    }

    const actions = Plainview.createElement('div');
    actions.className = 'pv-actions pv-export-actions';
    clone.append(actions);
    return clone.outerHTML;
  }

  async function katexExportCss(clone) {
    if (!clone.querySelector('.katex')) {
      return '';
    }
    const api = runtime();
    if (!api) {
      return '';
    }
    const css = await Plainview.requestText(api.getURL('vendor/katex/katex-export.css'));
    return css ?? '';
  }

  async function gzipBase64(html) {
    if (typeof CompressionStream !== 'function') {
      return '';
    }
    const stream = new Blob([html], { type: 'text/html;charset=utf-8' })
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = '';
    const chunk = 32_768;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }

    return btoa(binary);
  }

  function compressedWrapper(payload, title, version) {
    const versionAttribute = version ? ` data-pv-version="${escapeHtml(version)}"` : '';
    const script = fillTemplate(DecompressTemplate, { PAYLOAD: payload });
    return minifyHtml(
      fillTemplate(CompressedTemplate, {
        VERSION_ATTRIBUTE: versionAttribute,
        TITLE: escapeHtml(title),
        DECOMPRESS_SCRIPT: script,
      }),
    );
  }

  function minifyHtml(html) {
    const protectedBlocks = [];
    const protect = (match) => {
      const token = `\u0000PV${protectedBlocks.length}\u0000`;
      protectedBlocks.push(match);
      return token;
    };
    let output = String(html)
      .replace(/<(pre|script|style)\b[\s\S]*?<\/\1>/giu, protect)
      .replace(/<code\b[\s\S]*?<\/code>/giu, protect)
      .replace(/<!--(?!\[if)[\s\S]*?-->/gu, '')
      .replace(/>\s*\n\s*</gu, '><')
      .trim();
    for (let index = 0; index < protectedBlocks.length; index += 1) {
      output = output.replace(`\u0000PV${index}\u0000`, protectedBlocks[index]);
    }

    return output;
  }

  async function buildDataPayload(exportData, fileName, scope, showDataMenu) {
    if (!exportData) {
      return '';
    }

    const data = await Plainview.dataExport.serializeScopes({ exportData, fileName });
    if (data.entries.length === 0) {
      return '';
    }

    const documentData = exportData.getDocument?.() ?? null;
    if (documentData) {
      documentData.filter = null;
      if (scope === 'filtered') {
        const filtered = data.entries.find((entry) => entry.scope === 'filtered');
        if (filtered) {
          const value = exportData.getData('filtered');
          if (value && (value.kind === 'json' || value.kind === 'yaml' || value.kind === 'toml')) {
            documentData.value = value.data;
          }
          documentData.source = filtered.text;
        }
      }
    }

    const entries = data.entries.filter((entry) => entry.scope === scope);
    return JSON.stringify({ document: documentData, entries, showDataMenu }).replace(
      /</gu,
      '\\u003c',
    );
  }

  async function buildDataViewer(exportData) {
    if (!(exportData?.getDocument && runtime())) {
      return null;
    }

    const source = await Plainview.requestText(runtime().getURL('export-data.js'));
    if (!source) {
      return null;
    }

    return {
      content:
        '<div class="pv-shell"><main class="pv-main"><div class="pv-zoom-surface" id="pv-data-root"></div></main></div>',
      script: source.replace(/<\/script/giu, '<\\/script'),
    };
  }

  function exportContent({ clone, dataViewer, shell }) {
    if (dataViewer?.content) {
      return dataViewer.content;
    }

    if (shell) {
      return clone.outerHTML;
    }

    return `<main class="pv-main"><div class="pv-zoom-surface">${clone.outerHTML}</div></main>`;
  }

  async function packageExport({ dataViewer, html, title, uncompressed, version }) {
    if (uncompressed) {
      return html;
    }

    const compact = dataViewer ? html : minifyHtml(html);
    const compressed = await gzipBase64(compact);
    return compressed ? compressedWrapper(compressed, title, version) : compact;
  }

  async function buildChromeScript() {
    if (!runtime()) {
      return '';
    }

    const source = await Plainview.requestText(runtime().getURL('export-chrome.js'));
    return source ? source.replace(/<\/script/giu, '<\\/script') : '';
  }

  async function buildExportHtml({
    article,
    exportData,
    fileName,
    format,
    scope = 'complete',
    showDataMenu = null,
    theme,
    uncompressed = false,
  }) {
    const shell = article.closest('.pv-shell');
    const clone = cloneForExport(shell || article);
    const katex = await katexExportCss(clone);
    const title = fileName || document.title || 'Plainview document';
    const formatId = escapeHtml(format?.id || 'markdown');
    const exportId = crypto.randomUUID();
    const themeName = theme === 'dark' ? 'dark' : 'light';
    const version = document.documentElement.getAttribute('data-pv-version') || '';
    const hasToc = Boolean(clone.querySelector('.pv-toc-link'));
    const includeDataMenu =
      showDataMenu ?? Boolean(await Plainview.loadSetting(Plainview.EXPORT_DATA_MENU_KEY, false));
    const dataPayload = await buildDataPayload(exportData, title, scope, includeDataMenu);
    const dataViewer = dataPayload ? await buildDataViewer(exportData) : null;
    const chromeScript = await buildChromeScript();
    const content = exportContent({ clone, dataViewer, shell });
    const generator = version
      ? `<meta name="generator" content="Plainview ${escapeHtml(version)}">`
      : '';
    const creditVersion = version ? ` data-plainview-version="${escapeHtml(version)}"` : '';
    const html = fillTemplate(DocumentTemplate, {
      EXPORT_ID: exportId,
      FORMAT: formatId,
      THEME: themeName,
      TABLE_BORDERS: document.documentElement.dataset.pvTableBorders || 'off',
      TABLE_RESIZE: document.documentElement.dataset.pvTableResize || 'on',
      TABLE_LAYOUT: Plainview.validTableLayout(document.documentElement.dataset.pvTableLayout),
      DATA_EXPORTS: dataPayload,
      DATA_VIEWER_SCRIPT: dataViewer?.script || '',
      GENERATOR: generator,
      TITLE: escapeHtml(title),
      CSS: String(root.PLAINVIEW_CSS || ''),
      KATEX_CSS: katex,
      TOPBAR: cloneTopbar(),
      CONTENT: content,
      CREDIT_VERSION: creditVersion,
      EXPORT_CHROME_SCRIPT: chromeScript,
      TOC_SCRIPT: hasToc ? Plainview.exportScripts.TocScript : '',
    });
    return packageExport({ dataViewer, html, title, uncompressed, version });
  }

  async function exportHtml(options) {
    const html = await buildExportHtml(options);
    Plainview.downloadHtml(html, Plainview.exportFileName(options.fileName));
    return html;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    buildExportHtml,
    exportHtml,
  });
})(globalThis);
