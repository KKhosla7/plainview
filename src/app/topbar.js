import { createIconButton, icons } from '.././app/icons.js';
import { createThemeButton } from '../core/../app/theme.js';
import { createElement } from '../core/dom.js';

/* global Plainview */
function el(tag, className, text) {
  const node = createElement(tag);
  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function button(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

function createBrand({ fileName, url, formatLabel }) {
  const brand = el('div', 'pv-brand');
  const logo = el('span', 'pv-logo', 'P');
  logo.setAttribute('aria-hidden', 'true');

  const fileBox = el('div', 'pv-file');
  const version = document.documentElement.getAttribute('data-pv-version');
  fileBox.title = version ? `${url} · Plainview ${version}` : url;
  fileBox.append(el('span', 'pv-filename', fileName), el('span', 'pv-badge', formatLabel));

  brand.append(logo, fileBox);
  return brand;
}

function createViewTabs() {
  const views = el('div', 'pv-views');
  views.setAttribute('role', 'tablist');
  views.setAttribute('aria-label', 'Document view');

  const htmlTab = button('pv-view-tab pv-icon-tab');
  htmlTab.setAttribute('role', 'tab');
  htmlTab.setAttribute('aria-label', 'HTML');
  htmlTab.setAttribute('aria-selected', 'true');
  htmlTab.title = 'Rendered HTML view';
  htmlTab.append(icons.html());

  const sourceTab = button('pv-view-tab pv-icon-tab');
  sourceTab.setAttribute('role', 'tab');
  sourceTab.setAttribute('aria-label', 'Source');
  sourceTab.setAttribute('aria-selected', 'false');
  sourceTab.title = 'Raw source';

  sourceTab.append(icons.source());
  views.append(htmlTab, sourceTab);
  return { views, htmlTab, sourceTab };
}

function createActions({
  showDownload = true,
  showExport = true,
  showTableBorders = false,
  showToc = true,
  tableBordersKey,
} = {}) {
  const actions = el('div', 'pv-actions');

  const tocButton = button('pv-action pv-action-toc', 'TOC');
  tocButton.setAttribute('aria-expanded', 'false');
  tocButton.title = 'Table of contents';

  const themeButton = createThemeButton();
  const tableBordersButton = showTableBorders
    ? Plainview.createTableBordersButton({ settingKey: tableBordersKey })
    : null;

  const downloadButton = button('pv-action pv-action-download', 'Download');
  downloadButton.title = 'Download the original file';

  const exportButton = createIconButton(
    'pv-action pv-icon-action pv-action-export',
    'Export',
    icons.export(),
  );
  exportButton.title = 'Export data or standalone HTML';

  if (showToc) {
    actions.append(tocButton);
  }
  actions.append(themeButton);

  if (tableBordersButton) {
    actions.append(tableBordersButton);
  }

  if (showDownload) {
    actions.append(downloadButton);
  }

  if (showExport) {
    actions.append(exportButton);
  }

  return {
    actions,
    downloadButton,
    exportButton,
    tableBordersButton,
    themeButton,
    tocButton,
  };
}

function createTopbar({ fileName, url, formatLabel, showDownload, showTableBorders = false }) {
  const topbar = el('header', 'pv-topbar');
  const brand = createBrand({ fileName, url, formatLabel });
  const tabs = createViewTabs();
  const controls = createActions({ showDownload, showTableBorders });

  controls.actions.prepend(tabs.views);
  topbar.append(brand, controls.actions);

  return {
    element: topbar,
    htmlTab: tabs.htmlTab,
    sourceTab: tabs.sourceTab,
    tocButton: controls.tocButton,
    themeButton: controls.themeButton,
    downloadButton: controls.downloadButton,
    exportButton: controls.exportButton,
    tableBordersButton: controls.tableBordersButton,
  };
}

export { createActions as createTopbarActions, createTopbar };
