/* global chrome, browser */
/*
 * Open supported downloads in the extension viewer. Chromium downloads
 * text/csv, application/yaml and attachment responses before content scripts
 * can see them, so Plainview cancels the download, removes the saved file and
 * opens the original URL in the extension viewer instead.
 *
 * The viewer's Download button saves the original file when the user wants it.
 */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
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
  const opened = new Set();

  function toFileUrl(filePath) {
    const normalized = filePath.replace(/\\/gu, '/');
    const absolute = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `file://${encodeURI(absolute).replaceAll('#', '%23').replaceAll('?', '%3F')}`;
  }

  function extensionOf(value) {
    const [path] = String(value || '').split(/[?#]/u);
    const last = path.split(/[\\/]/u).pop() || '';
    const dot = last.lastIndexOf('.');
    return dot < 0 ? '' : last.slice(dot + 1).toLowerCase();
  }

  function supported(value) {
    return Supported.has(extensionOf(value));
  }

  function nameFromUrl(value) {
    try {
      return new URL(value).pathname.split('/').filter(Boolean).pop() || 'Document';
    } catch {
      return 'Document';
    }
  }

  function viewerUrl(target, name, remote) {
    const base = api.runtime.getURL('src/viewer.html');
    const url = `${base}?url=${encodeURIComponent(target)}&name=${encodeURIComponent(name || '')}`;
    return remote ? `${url}&remote=${encodeURIComponent(remote)}` : url;
  }

  async function discardDownload(id) {
    const results = await Promise.allSettled([
      api.downloads.removeFile(id),
      api.downloads.erase({ id }),
    ]);
    return results.every((result) => result.status === 'fulfilled');
  }

  async function openViewer(target, name, remote) {
    if (!target) {
      return false;
    }

    if (!/^(?:https?|file):/iu.test(target)) {
      return false;
    }

    if (!(supported(name) || supported(target))) {
      return false;
    }
    await api.tabs.create({ url: viewerUrl(target, name || nameFromUrl(target), remote) });
    return true;
  }

  if (api.action?.onClicked) {
    api.action.onClicked.addListener(() => {
      api.action.setBadgeText({ text: '' });
      api.runtime.openOptionsPage();
    });
  }

  api.downloads?.onCreated.addListener(async (item) => {
    if (opened.has(item.id)) {
      return;
    }

    const target = item.finalUrl || item.url || '';
    if (/^(?:blob|data):/iu.test(target)) {
      return;
    }
    const name = item.filename?.split(/[\\/]/u).pop() || nameFromUrl(target);
    if (!(supported(name) || supported(target))) {
      return;
    }

    opened.add(item.id);
    try {
      await api.downloads.cancel(item.id);
      await discardDownload(item.id);
      await openViewer(target, name);
    } catch {
      // The download was already complete. Open the original URL when possible
      // and remove the completed file so it does not stay in Downloads.
      if (/^https?:/iu.test(target)) {
        await discardDownload(item.id);
        try {
          await openViewer(target, name);
        } catch {
          opened.delete(item.id);
        }
      } else {
        opened.delete(item.id);
      }
    }
  });

  api.downloads?.onChanged.addListener(async (delta) => {
    if (delta.state?.current !== 'complete' || opened.has(delta.id)) {
      return;
    }

    const [item] = await api.downloads.search({ id: delta.id });
    if (!item?.filename) {
      return;
    }

    if (!(supported(item.filename) || supported(item.url))) {
      return;
    }
    // Extension-initiated blob downloads (the Download button) are not
    // downloads of a remote source document.
    if (/^(?:blob|data):/iu.test(item.url || '')) {
      return;
    }

    opened.add(delta.id);
    try {
      if (/^https?:/iu.test(item.url || '')) {
        const name = supported(item.filename.split(/[\\/]/u).pop() || '')
          ? item.filename.split(/[\\/]/u).pop()
          : nameFromUrl(item.url);
        await discardDownload(delta.id);
        await openViewer(item.url, name);
      } else {
        const target = toFileUrl(item.filename);
        const name = item.filename.split(/[\\/]/u).pop() || nameFromUrl(target);
        await api.tabs.create({ url: viewerUrl(target, name) });
      }
    } catch {
      opened.delete(delta.id);
    }
  });
})();
