/* global chrome, browser, Plainview */
(() => {
  const StatusResetMs = 1400;
  const Keys = Plainview.SETTING_KEYS;
  const api = globalThis.browser ?? globalThis.chrome;
  const autoReload = document.querySelector('#autoReloadSources');
  const tableBorders = document.querySelector('#tableBorders');
  const tableResize = document.querySelector('#tableResize');
  const tableLayout = document.querySelector('#tableLayout');
  const tableStatus = document.querySelector('#tableStatus');
  const sourceStatus = document.querySelector('#sourceStatus');
  const shortcutSelects = [...document.querySelectorAll('[data-shortcut]')];
  const shortcutStatus = document.querySelector('#shortcutStatus');
  const [exportDataMenu, exportStatus, exportUncompressed] = [
    '#exportDataMenu',
    '#exportStatus',
    '#exportUncompressed',
  ].map((selector) => document.querySelector(selector));
  const controls = [...document.querySelectorAll('input, select')];

  for (const control of controls) {
    control.disabled = true;
  }

  Plainview.installFonts?.();

  async function load() {
    const data = await api.storage.local.get({
      [Keys.AutoReload]: false,
      [Keys.TableBorders]: false,
      [Keys.TableResize]: true,
      [Keys.TableLayout]: 'wrap',
      [Keys.Shortcuts]: 'alt-s',
      [Keys.ExportDataMenu]: false,
      [Keys.ExportUncompressed]: false,
    });
    autoReload.checked = Boolean(data[Keys.AutoReload]);
    tableBorders.checked = Boolean(data[Keys.TableBorders]);
    tableResize.checked = Boolean(data[Keys.TableResize]);
    tableLayout.value = data[Keys.TableLayout] === 'scroll' ? 'scroll' : 'wrap';
    const shortcuts = Plainview.shortcutConfig.normalizeShortcuts(data[Keys.Shortcuts]);
    for (const select of shortcutSelects) {
      select.value = shortcuts[select.dataset.shortcut];
    }
    exportDataMenu.checked = Boolean(data[Keys.ExportDataMenu]);
    exportUncompressed.checked = Boolean(data[Keys.ExportUncompressed]);
    document.querySelector('#version').textContent = api.runtime.getManifest().version;
    for (const control of controls) {
      control.disabled = false;
    }
    document.documentElement.dataset.pvOptionsReady = 'true';
  }

  Plainview.onAsync(exportDataMenu, 'change', async () => {
    await api.storage.local.set({
      [Keys.ExportDataMenu]: exportDataMenu.checked,
    });
    exportStatus.textContent = exportDataMenu.checked
      ? 'Data downloads enabled in exported HTML'
      : 'Data downloads hidden in exported HTML';
    exportStatus.classList.add('visible');
    globalThis.setTimeout(() => exportStatus.classList.remove('visible'), StatusResetMs);
  });

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

  for (const select of shortcutSelects) {
    Plainview.onAsync(select, 'change', async () => {
      const shortcuts = Object.fromEntries(
        shortcutSelects.map((item) => [item.dataset.shortcut, item.value]),
      );
      await api.storage.local.set({ [Keys.Shortcuts]: shortcuts });
      shortcutStatus.textContent = 'Shortcut saved';
      shortcutStatus.classList.add('visible');
      globalThis.setTimeout(() => shortcutStatus.classList.remove('visible'), StatusResetMs);
    });
  }

  Plainview.onAsync(tableBorders, 'change', async () => {
    await api.storage.local.set({ [Keys.TableBorders]: tableBorders.checked });
    tableStatus.textContent = tableBorders.checked
      ? 'Column borders enabled'
      : 'Column borders disabled';
    tableStatus.classList.add('visible');
    globalThis.setTimeout(() => tableStatus.classList.remove('visible'), StatusResetMs);
  });

  Plainview.onAsync(tableResize, 'change', async () => {
    await api.storage.local.set({ [Keys.TableResize]: tableResize.checked });
    tableStatus.textContent = tableResize.checked
      ? 'Column resizing enabled'
      : 'Column resizing disabled';
    tableStatus.classList.add('visible');
    globalThis.setTimeout(() => tableStatus.classList.remove('visible'), StatusResetMs);
  });

  Plainview.onAsync(tableLayout, 'change', async () => {
    await api.storage.local.set({ [Keys.TableLayout]: tableLayout.value });
    tableStatus.textContent =
      tableLayout.value === 'wrap' ? 'Wide tables wrap text' : 'Wide tables scroll sideways';
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
