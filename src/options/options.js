/* global chrome, browser, Plainview */
(function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const toggle = document.getElementById('autoOpen');
  const status = document.getElementById('status');

  Plainview.installFonts?.();

  async function load() {
    const data = await api.storage.local.get({ autoOpenDownloads: false });
    toggle.checked = Boolean(data.autoOpenDownloads);
    document.getElementById('version').textContent =
      api.runtime.getManifest().version;
  }

  toggle.addEventListener('change', async () => {
    await api.storage.local.set({ autoOpenDownloads: toggle.checked });
    status.textContent = toggle.checked ? 'Enabled' : 'Disabled';
    status.classList.add('visible');
    window.setTimeout(() => status.classList.remove('visible'), 1400);
  });

  load();
})();
