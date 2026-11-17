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

    const htmlTab = button('pv-view-tab', 'HTML');
    htmlTab.setAttribute('role', 'tab');
    htmlTab.setAttribute('aria-selected', 'true');
    htmlTab.title = 'Rendered view';

    const sourceTab = button('pv-view-tab', 'Source');
    sourceTab.setAttribute('role', 'tab');
    sourceTab.setAttribute('aria-selected', 'false');
    sourceTab.title = 'Original file text';

    views.append(htmlTab, sourceTab);
    return { views, htmlTab, sourceTab };
  }

  function createActions() {
    const actions = el('div', 'pv-actions');

    const tocButton = button('pv-action pv-action-toc', 'TOC');
    tocButton.setAttribute('aria-expanded', 'false');
    tocButton.title = 'Table of contents';

    const themes = el('div', 'pv-themes');
    themes.setAttribute('role', 'group');
    themes.setAttribute('aria-label', 'Theme');
    const lightButton = button('pv-theme-tab', 'Light');
    lightButton.setAttribute('aria-label', 'Light theme');
    const darkButton = button('pv-theme-tab', 'Dark');
    darkButton.setAttribute('aria-label', 'Dark theme');
    themes.append(lightButton, darkButton);

    const downloadButton = button('pv-action pv-action-download', 'Download');
    downloadButton.title = 'Download this file';

    const exportButton = button('pv-action pv-action-export', 'Export');
    exportButton.title = 'Export a standalone HTML copy';

    actions.append(
      tocButton,
      el('span', 'pv-theme-label', 'Theme'),
      themes,
      downloadButton,
      exportButton,
    );
    return { actions, tocButton, lightButton, darkButton, downloadButton, exportButton };
  }

  function createTopbar({ fileName, url, formatLabel }) {
    const topbar = el('header', 'pv-topbar');
    const brand = createBrand({ fileName, url, formatLabel });
    const tabs = createViewTabs();
    const controls = createActions();

    controls.actions.prepend(el('span', 'pv-view-label', 'View'), tabs.views);
    topbar.append(brand, controls.actions);

    return {
      element: topbar,
      htmlTab: tabs.htmlTab,
      sourceTab: tabs.sourceTab,
      tocButton: controls.tocButton,
      lightButton: controls.lightButton,
      darkButton: controls.darkButton,
      downloadButton: controls.downloadButton,
      exportButton: controls.exportButton,
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createTopbar });
})(globalThis);
