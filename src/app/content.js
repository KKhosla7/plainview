/* global Plainview */
/*
 * Entry point. Runs on every page, then exits quickly unless the document is
 * a plain-text/Markdown/JSON/XML source that the browser is displaying.
 */
(function () {
  'use strict';

  function isRawTextDocument() {
    return Plainview.isRawTextDocument();
  }

  function main() {
    if (globalThis.__plainviewLoaded) return;
    globalThis.__plainviewLoaded = true;

    if (document.documentElement?.getAttribute?.('data-pv')) return;
    if (!document.body && !Plainview.isRawTextDocument()) return;

    const format = Plainview.detectFormat(
      document.contentType,
      decodeURIComponentSafe(location.pathname),
    );
    if (!format) return;
    if (!isRawTextDocument()) return;

    const source = Plainview.extractSource(format);

    // Firefox gives XML documents no <body>; turn the document into an XHTML
    // shell before mounting the reader.
    if (format.id === 'xml') {
      Plainview.ensureHtmlShellForXml();
    }

    if (!document.body) return;

    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';
    document.documentElement.setAttribute('data-pv-version', version);
    console.info(`Plainview ${version} · ${format.id}`);

    document.documentElement.setAttribute('data-pv', 'pending');
    Plainview.mountViewer({ source, url: location.href, format }).catch((error) => {
      document.documentElement.setAttribute(
        'data-pv-error',
        String(error?.message || error),
      );
      console.error(`Plainview ${version}: failed to mount the reader`, error);
    });
  }

  function decodeURIComponentSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
})();
