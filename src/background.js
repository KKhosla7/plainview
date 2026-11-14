/* global chrome, browser */
/*
 * Optional download auto-open and the toolbar entry point for settings.
 * The extension cannot change the operating system's default app; this only
 * opens a downloaded document in a new tab when the user enables the option.
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
  ]);
  const opened = new Set();

  function toFileUrl(filePath) {
    const normalized = filePath.replace(/\\/gu, '/');
    const absolute = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `file://${encodeURI(absolute).replaceAll('#', '%23').replaceAll('?', '%3F')}`;
  }

  async function autoOpenEnabled() {
    const data = await api.storage.local.get({ autoOpenDownloads: false });
    return Boolean(data.autoOpenDownloads);
  }

  const ReleaseBase = 'https://github.com/KKhosla7/plainview/releases/tag/v';

  function releaseUrl() {
    return `${ReleaseBase}${api.runtime.getManifest().version}`;
  }

  if (api.action?.onClicked) {
    api.action.onClicked.addListener(() => {
      api.action.setBadgeText({ text: '' });
      api.runtime.openOptionsPage();
    });
  }

  api.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'update') {
      return;
    }
    const { version } = api.runtime.getManifest();

    if (api.notifications) {
      const result = api.notifications.create(`plainview-update-${version}`, {
        type: 'basic',
        iconUrl: api.runtime.getURL('assets/icon-128.png'),
        title: 'Plainview updated',
        message: `Version ${version} is ready. Open the release notes for what changed.`,
      });
      if (result && typeof result.catch === 'function') {
        result.catch(() => undefined);
      }
    }

    if (api.action?.setBadgeText) {
      api.action.setBadgeText({ text: 'NEW' });
      api.action.setBadgeBackgroundColor({ color: '#1F4FA0' });
    }
  });

  api.notifications?.onClicked.addListener((id) => {
    if (!id.startsWith('plainview-update-')) {
      return;
    }
    api.tabs.create({ url: releaseUrl() });
    api.notifications.clear(id);
    api.action?.setBadgeText({ text: '' });
  });

  api.downloads?.onChanged.addListener(async (delta) => {
    if (delta.state?.current !== 'complete') {
      return;
    }
    if (opened.has(delta.id)) {
      return;
    }
    if (!(await autoOpenEnabled())) {
      return;
    }

    const [item] = await api.downloads.search({ id: delta.id });
    if (!item?.filename) {
      return;
    }

    const extension = item.filename.split('.').pop()?.toLowerCase() ?? '';
    if (!Supported.has(extension)) {
      return;
    }

    opened.add(delta.id);
    try {
      await api.tabs.create({ url: toFileUrl(item.filename) });
    } catch {
      opened.delete(delta.id);
    }
  });
})();
