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
    for (const node of clone.querySelectorAll('.pv-views, .pv-actions')) {
      node.remove();
    }

    const actions = Plainview.createElement('div');
    actions.className = 'pv-actions pv-export-actions';
    const themes = Plainview.createElement('div');
    themes.className = 'pv-themes';
    themes.setAttribute('role', 'group');
    themes.setAttribute('aria-label', 'Theme');
    for (const [theme, label] of [
      ['light', 'Light'],
      ['dark', 'Dark'],
    ]) {
      const button = Plainview.createElement('button');
      button.type = 'button';
      button.className = 'pv-theme-tab';
      button.textContent = label;
      button.setAttribute('data-pv-export-theme', theme);
      button.setAttribute('aria-label', `${label} theme`);
      themes.append(button);
    }
    actions.append(themes);
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

  async function buildExportHtml({ article, fileName, format, theme, uncompressed = false }) {
    const shell = article.closest('.pv-shell');
    const clone = cloneForExport(shell || article);
    const katex = await katexExportCss(clone);
    const title = fileName || document.title || 'Plainview document';
    const formatId = escapeHtml(format?.id || 'markdown');
    const themeName = theme === 'dark' ? 'dark' : 'light';
    const version = document.documentElement.getAttribute('data-pv-version') || '';
    const hasToc = Boolean(clone.querySelector('.pv-toc-link'));
    const content = shell
      ? clone.outerHTML
      : `<main class="pv-main"><div class="pv-zoom-surface">${clone.outerHTML}</div></main>`;
    const generator = version
      ? `<meta name="generator" content="Plainview ${escapeHtml(version)}">`
      : '';
    const creditVersion = version ? ` data-plainview-version="${escapeHtml(version)}"` : '';
    const html = fillTemplate(DocumentTemplate, {
      FORMAT: formatId,
      THEME: themeName,
      TABLE_BORDERS: document.documentElement.dataset.pvTableBorders || 'off',
      GENERATOR: generator,
      TITLE: escapeHtml(title),
      CSS: String(root.PLAINVIEW_CSS || ''),
      KATEX_CSS: katex,
      TOPBAR: cloneTopbar(),
      CONTENT: content,
      CREDIT_VERSION: creditVersion,
      THEME_SCRIPT: Plainview.exportScripts.ThemeScript,
      TOP_SCRIPT: Plainview.exportScripts.TopScript,
      TOC_SCRIPT: hasToc ? Plainview.exportScripts.TocScript : '',
    });
    if (uncompressed) {
      return html;
    }
    const compressed = await gzipBase64(minifyHtml(html));
    return compressed ? compressedWrapper(compressed, title, version) : minifyHtml(html);
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
