/* global chrome, browser, Plainview */
(() => {
  const StatusResetMs = 1400;
  const Keys = Plainview.SETTING_KEYS;
  const api = globalThis.browser ?? globalThis.chrome;
  const autoReload = document.querySelector('#autoReloadSources');
  const tableBorders = document.querySelector('#tableBorders');
  const tableStatus = document.querySelector('#tableStatus');
  const sourceStatus = document.querySelector('#sourceStatus');
  const shortcutPreset = document.querySelector('#shortcutPreset');
  const shortcutStatus = document.querySelector('#shortcutStatus');
  const exportUncompressed = document.querySelector('#exportUncompressed');
  const exportStatus = document.querySelector('#exportStatus');

  Plainview.installFonts?.();

  async function load() {
    const data = await api.storage.local.get({
      [Keys.AutoReload]: false,
      [Keys.TableBorders]: false,
      [Keys.Shortcuts]: 'alt-s',
      [Keys.ExportUncompressed]: false,
    });
    autoReload.checked = Boolean(data[Keys.AutoReload]);
    tableBorders.checked = Boolean(data[Keys.TableBorders]);
    shortcutPreset.value = data[Keys.Shortcuts];
    exportUncompressed.checked = Boolean(data[Keys.ExportUncompressed]);
    document.querySelector('#version').textContent = api.runtime.getManifest().version;
  }

  Plainview.onAsync(exportUncompressed, 'change', async () => {
    await api.storage.local.set({
      [Keys.ExportUncompressed]: exportUncompressed.checked,
    });
    exportStatus.textContent = exportUncompressed.checked
      ? 'Uncompressed export enabled'
      : 'Compressed export enabled';
    exportStatus.classList.add('visible');
    globalThis.setTimeout(() => exportStatus.classList.remove('visible'), StatusResetMs);
  });

  Plainview.onAsync(shortcutPreset, 'change', async () => {
    await api.storage.local.set({ [Keys.Shortcuts]: shortcutPreset.value });
    shortcutStatus.textContent = 'Shortcut saved';
    shortcutStatus.classList.add('visible');
    globalThis.setTimeout(() => shortcutStatus.classList.remove('visible'), StatusResetMs);
  });

  Plainview.onAsync(tableBorders, 'change', async () => {
    await api.storage.local.set({ [Keys.TableBorders]: tableBorders.checked });
    tableStatus.textContent = tableBorders.checked
      ? 'Column borders enabled'
      : 'Column borders disabled';
    tableStatus.classList.add('visible');
    globalThis.setTimeout(() => tableStatus.classList.remove('visible'), StatusResetMs);
  });

  Plainview.onAsync(autoReload, 'change', async () => {
    await api.storage.local.set({ [Keys.AutoReload]: autoReload.checked });
    sourceStatus.textContent = autoReload.checked ? 'Auto-reload enabled' : 'Ask before reloading';
    sourceStatus.classList.add('visible');
    globalThis.setTimeout(() => sourceStatus.classList.remove('visible'), StatusResetMs);
  });

  load();
})();
