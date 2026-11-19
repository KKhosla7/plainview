import { extractSource, isRawTextDocument } from './core/document.js';
import { detectFormat } from './core/formats.js';
import { ensureHtmlShellForXml } from './core/xml-shell.js';

(() => {
  function decodeUriComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  async function main() {
    if (globalThis.__plainviewLoaded) {
      return;
    }
    globalThis.__plainviewLoaded = true;

    if (document.documentElement?.getAttribute?.('data-pv')) {
      return;
    }

    if (!(document.body || isRawTextDocument())) {
      return;
    }

    const format = detectFormat(document.contentType, decodeUriComponentSafe(location.pathname));
    if (!format) {
      return;
    }

    if (!isRawTextDocument()) {
      return;
    }

    const source = extractSource(format);
    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';

    document.documentElement.setAttribute('data-pv-version', version);
    document.documentElement.setAttribute('data-pv', 'pending');

    try {
      const { mountViewer } = await import(runtime.getURL('app.js'));
      if (format.id === 'xml') {
        ensureHtmlShellForXml();
      }

      if (!document.body) {
        return;
      }
      await mountViewer({
        source,
        url: location.href,
        format,
      });
    } catch (error) {
      document.documentElement.setAttribute(
        'data-pv-error',
        String(error instanceof Error ? error.message : error),
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
})();
