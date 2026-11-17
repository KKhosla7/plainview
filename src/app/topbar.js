/* global Plainview */
((root) => {
  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
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
    htmlTab.append(Plainview.icons.html());

    const sourceTab = button('pv-view-tab pv-icon-tab');
    sourceTab.setAttribute('role', 'tab');
    sourceTab.setAttribute('aria-label', 'Source');
    sourceTab.setAttribute('aria-selected', 'false');
    sourceTab.title = 'Raw source';

    sourceTab.append(Plainview.icons.source());
    views.append(htmlTab, sourceTab);
    return { views, htmlTab, sourceTab };
  }

  function createActions({ showDownload }) {
    const actions = el('div', 'pv-actions');

    const tocButton = button('pv-action pv-action-toc', 'TOC');
    tocButton.setAttribute('aria-expanded', 'false');
    tocButton.title = 'Table of contents';

    const themeButton = button('pv-action pv-icon-action pv-theme-toggle');
    themeButton.setAttribute('aria-label', 'Toggle theme');
    themeButton.title = 'Toggle theme';
    themeButton.append(Plainview.icons.theme());

    const downloadButton = button('pv-action pv-action-download', 'Download');
    downloadButton.title = 'Download the original file';

    const exportButton = button('pv-action pv-icon-action pv-action-export');
    exportButton.setAttribute('aria-label', 'Export');
    exportButton.title = 'Export data or standalone HTML';
    exportButton.append(Plainview.icons.export());

    actions.append(tocButton, themeButton);
    if (showDownload) {
      actions.append(downloadButton);
    }
    actions.append(exportButton);
    return { actions, tocButton, themeButton, downloadButton, exportButton };
  }

  function createTopbar({ fileName, url, formatLabel, showDownload }) {
    const topbar = el('header', 'pv-topbar');
    const brand = createBrand({ fileName, url, formatLabel });
    const tabs = createViewTabs();
    const controls = createActions({ showDownload });

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
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createTopbar });
})(globalThis);
