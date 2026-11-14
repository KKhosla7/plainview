/* global chrome, browser */
/*
 * Optional download auto-open and the toolbar entry point for settings.
 * The extension cannot change the operating system's default app; this only
 * opens a downloaded document in a new tab when the user enables the option.
 */
(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const SUPPORTED = new Set([
    'md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdx',
    'json', 'jsonc', 'geojson', 'jsonld', 'har', 'webmanifest',
    'xml', 'rss', 'atom', 'rdf', 'opml', 'wsdl', 'plist', 'xsl', 'xslt',
  ]);
  const opened = new Set();

  function toFileUrl(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const absolute = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `file://${encodeURI(absolute)
      .replaceAll('#', '%23')
      .replaceAll('?', '%3F')}`;
  }

  async function autoOpenEnabled() {
    const data = await api.storage.local.get({ autoOpenDownloads: false });
    return Boolean(data.autoOpenDownloads);
  }

  if (api.action?.onClicked) {
    api.action.onClicked.addListener(() => {
      api.runtime.openOptionsPage();
    });
  }

  api.downloads?.onChanged.addListener(async (delta) => {
    if (delta.state?.current !== 'complete') return;
    if (opened.has(delta.id)) return;
    if (!(await autoOpenEnabled())) return;

    const [item] = await api.downloads.search({ id: delta.id });
    if (!item?.filename) return;

    const extension = item.filename.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED.has(extension)) return;

    opened.add(delta.id);
    try {
      await api.tabs.create({ url: toFileUrl(item.filename) });
    } catch {
      opened.delete(delta.id);
    }
  });
})();
