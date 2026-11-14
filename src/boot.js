/* global Plainview */
/*
 * Tiny content-script loader. It runs on every page, detects a supported raw
 * document, then imports the reader bundle (app.js) only for those pages.
 */
(function () {
  'use strict';

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  async function main() {
    if (globalThis.__plainviewLoaded) return;
    globalThis.__plainviewLoaded = true;

    if (document.documentElement?.getAttribute?.('data-pv')) return;
    if (!document.body && !Plainview.isRawTextDocument()) return;

    const format = Plainview.detectFormat(
      document.contentType,
      decodeURIComponentSafe(location.pathname),
    );
    if (!format) return;
    if (!Plainview.isRawTextDocument()) return;

    const source = Plainview.extractSource(format);
    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';

    document.documentElement.setAttribute('data-pv-version', version);
    document.documentElement.setAttribute('data-pv', 'pending');
    console.info(`Plainview ${version} · ${format.id}`);

    try {
      await import(runtime.getURL('app.js'));
      if (format.id === 'xml') Plainview.ensureHtmlShellForXml();
      if (!document.body) return;
      await Plainview.mountViewer({
        source,
        url: location.href,
        format,
      });
    } catch (error) {
      document.documentElement.setAttribute(
        'data-pv-error',
        String(error?.message || error),
      );
      console.error(`Plainview ${version}: failed to mount the reader`, error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
})();
