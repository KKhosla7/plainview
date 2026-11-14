/* global MDView */
(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = MDView.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(className, label) {
    const node = el('button', className, label);
    node.type = 'button';
    return node;
  }

  function createBrand({ fileName, url, formatLabel }) {
    const brand = el('div', 'mdv-brand');
    const logo = el('span', 'mdv-logo', 'P');
    logo.setAttribute('aria-hidden', 'true');

    const fileBox = el('div', 'mdv-file');
    const version = document.documentElement.getAttribute('data-mdv-version');
    fileBox.title = version ? `${url} · Plainview ${version}` : url;
    fileBox.append(
      el('span', 'mdv-filename', fileName),
      el('span', 'mdv-badge', formatLabel),
    );

    brand.append(logo, fileBox);
    return brand;
  }

  function createViewTabs() {
    const views = el('div', 'mdv-views');
    views.setAttribute('role', 'tablist');
    views.setAttribute('aria-label', 'Document view');

    const htmlTab = button('mdv-view-tab', 'HTML');
    htmlTab.setAttribute('role', 'tab');
    htmlTab.setAttribute('aria-selected', 'true');
    htmlTab.title = 'Rendered view';

    const sourceTab = button('mdv-view-tab', 'Source');
    sourceTab.setAttribute('role', 'tab');
    sourceTab.setAttribute('aria-selected', 'false');
    sourceTab.title = 'Original file text';

    views.append(htmlTab, sourceTab);
    return { views, htmlTab, sourceTab };
  }

  function createActions() {
    const actions = el('div', 'mdv-actions');

    const tocButton = button('mdv-action mdv-action-toc', 'TOC');
    tocButton.setAttribute('aria-expanded', 'false');
    tocButton.title = 'Table of contents';

    const themes = el('div', 'mdv-themes');
    themes.setAttribute('role', 'group');
    themes.setAttribute('aria-label', 'Theme');
    const lightButton = button('mdv-theme-tab', 'Light');
    lightButton.setAttribute('aria-label', 'Light theme');
    const darkButton = button('mdv-theme-tab', 'Dark');
    darkButton.setAttribute('aria-label', 'Dark theme');
    themes.append(lightButton, darkButton);

    const downloadButton = button('mdv-action mdv-action-download', 'Download');
    downloadButton.title = 'Download this file';

    actions.append(
      tocButton,
      el('span', 'mdv-theme-label', 'Theme'),
      themes,
      downloadButton,
    );
    return { actions, tocButton, lightButton, darkButton, downloadButton };
  }

  function createTopbar({ fileName, url, formatLabel }) {
    const topbar = el('header', 'mdv-topbar');
    const brand = createBrand({ fileName, url, formatLabel });
    const tabs = createViewTabs();
    const controls = createActions();

    controls.actions.prepend(
      el('span', 'mdv-view-label', 'View'),
      tabs.views,
    );
    topbar.append(brand, controls.actions);

    return {
      element: topbar,
      htmlTab: tabs.htmlTab,
      sourceTab: tabs.sourceTab,
      tocButton: controls.tocButton,
      lightButton: controls.lightButton,
      darkButton: controls.darkButton,
      downloadButton: controls.downloadButton,
    };
  }

  root.MDView = Object.assign(root.MDView || {}, { createTopbar });
})(globalThis);
