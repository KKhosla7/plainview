(() => {
  const Supported = new Set([
    'md',
    'markdown',
    'mdown',
    'mkd',
    'mkdn',
    'mdwn',
    'mdx',
    'json',
    'jsonc',
    'jsonl',
    'ndjson',
    'geojson',
    'jsonld',
    'har',
    'webmanifest',
    'xml',
    'rss',
    'atom',
    'rdf',
    'opml',
    'wsdl',
    'plist',
    'xsl',
    'xslt',
    'yaml',
    'yml',
    'toml',
    'csv',
    'tsv',
  ]);

  function extensionOf(name) {
    const last =
      String(name || '')
        .split(/[\\/]/u)
        .pop() || '';
    const dot = last.lastIndexOf('.');
    return dot < 0 ? '' : last.slice(dot + 1).toLowerCase();
  }

  function ignoreSendError() {
    return false;
  }

  function requestSource(url) {
    return fetch(url);
  }

  function downloadBlob(event) {
    const anchor = event.target?.closest?.('a[download]');
    if (
      !anchor ||
      anchor.dataset.pvDownload === 'ignore' ||
      !String(anchor.href).startsWith('blob:')
    ) {
      return;
    }

    const name = anchor.download || '';
    if (!Supported.has(extensionOf(name))) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    requestSource(anchor.href)
      .then((response) => response.text())
      .then((text) => {
        const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
        return runtime.sendMessage({ name, text, type: 'plainview:open-download' });
      })
      .catch(ignoreSendError);
  }

  document.addEventListener('click', downloadBlob, true);
})();
