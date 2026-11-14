/* global MDView */
/*
 * Entry point. Runs on every page, then exits quickly unless the document is
 * a plain-text/Markdown/JSON/XML source that the browser is displaying.
 */
(function () {
  'use strict';

  function isRawTextDocument() {
    return MDView.isRawTextDocument();
  }

  function main() {
    if (globalThis.__plainviewLoaded) return;
    globalThis.__plainviewLoaded = true;

    if (document.documentElement?.getAttribute?.('data-mdv')) return;
    if (!document.body && !MDView.isRawTextDocument()) return;

    const format = MDView.detectFormat(
      document.contentType,
      decodeURIComponentSafe(location.pathname),
    );
    if (!format) return;
    if (!isRawTextDocument()) return;

    const source = MDView.extractSource(format);

    // Firefox gives XML documents no <body>; turn the document into an XHTML
    // shell before mounting the reader.
    if (format.id === 'xml') {
      MDView.ensureHtmlShellForXml();
    }

    if (!document.body) return;

    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';
    document.documentElement.setAttribute('data-mdv-version', version);
    console.info(`Plainview ${version} · ${format.id}`);

    document.documentElement.setAttribute('data-mdv', 'pending');
    MDView.mountViewer({ source, url: location.href, format }).catch((error) => {
      document.documentElement.setAttribute(
        'data-mdv-error',
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
