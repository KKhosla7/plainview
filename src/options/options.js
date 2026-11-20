import { onAsync } from '../core/events.js';
import { installFonts } from '../core/fonts.js';
import { SETTING_KEYS } from '.././core/setting-keys.js';

const STATUS_RESET_MS = 1400;
const DEFAULT_CONTENT_FONT_SIZE = 12;
const MIN_CONTENT_FONT_SIZE = 10;
const MAX_CONTENT_FONT_SIZE = 20;
const Keys = SETTING_KEYS;
const api = globalThis.browser ?? globalThis.chrome;
const [autoReload, contentFontSize, contentFontStatus, formatValues, indentGuides] = [
  '#autoReloadSources',
  '#contentFontSize',
  '#contentFontStatus',
  '#formatValues',
  '#indentGuides',
].map((selector) => document.querySelector(selector));
const tableBorders = document.querySelector('#tableBorders');
const tableResize = document.querySelector('#tableResize');
const tableLayout = document.querySelector('#tableLayout');
const [tableStatus, sourceStatus] = ['#tableStatus', '#sourceStatus'].map((selector) =>
  document.querySelector(selector),
);
const [exportDataMenu, exportStatus, exportUncompressed] = [
  '#exportDataMenu',
  '#exportStatus',
  '#exportUncompressed',
].map((selector) => document.querySelector(selector));
const controls = [...document.querySelectorAll('input, select')];

for (const control of controls) {
  control.disabled = true;
}

onAsync(document.querySelector('#showOnboarding'), 'click', async () => {
  await api.tabs.create({ url: api.runtime.getURL('src/options/onboarding.html') });
});

async function load() {
  installFonts();
  const data = await api.storage.local.get({
    [Keys.AutoReload]: false,
    [Keys.ContentFontSize]: DEFAULT_CONTENT_FONT_SIZE,
    [Keys.FormatValues]: true,
    [Keys.IndentGuides]: true,
    [Keys.TableBorders]: false,
    [Keys.TableResize]: true,
    [Keys.TableLayout]: 'wrap',
    [Keys.Shortcuts]: 'alt-s',
    [Keys.ExportDataMenu]: false,
    [Keys.ExportUncompressed]: false,
  });
  contentFontSize.value = String(Number(data[Keys.ContentFontSize]) || DEFAULT_CONTENT_FONT_SIZE);
  for (const [control, key] of [
    [autoReload, Keys.AutoReload],
    [formatValues, Keys.FormatValues],
    [indentGuides, Keys.IndentGuides],
  ]) {
    control.checked = Boolean(data[key]);
  }
  tableBorders.checked = Boolean(data[Keys.TableBorders]);
  tableResize.checked = Boolean(data[Keys.TableResize]);
  tableLayout.value = data[Keys.TableLayout] === 'scroll' ? 'scroll' : 'wrap';
  exportDataMenu.checked = Boolean(data[Keys.ExportDataMenu]);
  exportUncompressed.checked = Boolean(data[Keys.ExportUncompressed]);
  document.querySelector('#version').textContent = api.runtime.getManifest().version;
  for (const control of controls) {
    control.disabled = false;
  }
  document.documentElement.dataset.pvOptionsReady = 'true';
}

for (const [control, key] of [
  [formatValues, Keys.FormatValues],
  [indentGuides, Keys.IndentGuides],
]) {
  onAsync(control, 'change', async () => {
    await api.storage.local.set({ [key]: control.checked });
  });
}

onAsync(contentFontSize, 'change', async () => {
  const value = Math.max(
    MIN_CONTENT_FONT_SIZE,
    Math.min(MAX_CONTENT_FONT_SIZE, Number(contentFontSize.value) || DEFAULT_CONTENT_FONT_SIZE),
  );
  contentFontSize.value = String(value);
  await api.storage.local.set({ [Keys.ContentFontSize]: value });
  contentFontStatus.textContent = `Tree font size set to ${value}px`;
  contentFontStatus.classList.add('visible');
  globalThis.setTimeout(() => contentFontStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(exportDataMenu, 'change', async () => {
  await api.storage.local.set({
    [Keys.ExportDataMenu]: exportDataMenu.checked,
  });
  exportStatus.textContent = exportDataMenu.checked
    ? 'Data downloads enabled in exported HTML'
    : 'Data downloads hidden in exported HTML';
  exportStatus.classList.add('visible');
  globalThis.setTimeout(() => exportStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(exportUncompressed, 'change', async () => {
  await api.storage.local.set({
    [Keys.ExportUncompressed]: exportUncompressed.checked,
  });
  exportStatus.textContent = exportUncompressed.checked
    ? 'Uncompressed export enabled'
    : 'Compressed export enabled';
  exportStatus.classList.add('visible');
  globalThis.setTimeout(() => exportStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(tableBorders, 'change', async () => {
  await api.storage.local.set({ [Keys.TableBorders]: tableBorders.checked });
  tableStatus.textContent = tableBorders.checked
    ? 'Column borders enabled'
    : 'Column borders disabled';
  tableStatus.classList.add('visible');
  globalThis.setTimeout(() => tableStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(tableResize, 'change', async () => {
  await api.storage.local.set({ [Keys.TableResize]: tableResize.checked });
  tableStatus.textContent = tableResize.checked
    ? 'Column resizing enabled'
    : 'Column resizing disabled';
  tableStatus.classList.add('visible');
  globalThis.setTimeout(() => tableStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(tableLayout, 'change', async () => {
  await api.storage.local.set({ [Keys.TableLayout]: tableLayout.value });
  tableStatus.textContent =
    tableLayout.value === 'wrap' ? 'Wide tables wrap text' : 'Wide tables scroll sideways';
  tableStatus.classList.add('visible');
  globalThis.setTimeout(() => tableStatus.classList.remove('visible'), STATUS_RESET_MS);
});

onAsync(autoReload, 'change', async () => {
  await api.storage.local.set({ [Keys.AutoReload]: autoReload.checked });
  sourceStatus.textContent = autoReload.checked
    ? 'Automatic refresh enabled'
    : 'Ask before refreshing';
  sourceStatus.classList.add('visible');
  globalThis.setTimeout(() => sourceStatus.classList.remove('visible'), STATUS_RESET_MS);
});

load();
