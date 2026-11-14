/* global MDView */
/*
 * Mermaid is loaded lazily: pages without a ```mermaid block never pay the
 * download/parse cost.
 *
 * Firefox content scripts run under the extension CSP, which blocks
 * Function("return this") used by mermaid's lodash chunk. The vendor build
 * rewrites that one expression to globalThis.
 */
(function (root) {
  'use strict';

  const ASSET_PATH = 'vendor/mermaid/mermaid.esm.min.mjs';
  let loader = null;
  let renderGeneration = 0;
  let renderId = 0;

  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
  }

  function loadMermaid() {
    if (!loader) {
      const api = runtime();
      if (!api) throw new Error('extension runtime is unavailable');
      loader = import(api.getURL(ASSET_PATH)).then((module) => {
        const mermaid = module?.default ?? root.mermaid;
        if (!mermaid || typeof mermaid.render !== 'function') {
          throw new Error('Mermaid module did not expose a render() API');
        }
        return mermaid;
      });
    }
    return loader;
  }

  function showError(block, message) {
    const panel = MDView.createElement('div');
    panel.className = 'mdv-mermaid-error';
    panel.textContent = `Diagram error: ${message}`;
    block.diagram.replaceChildren(panel);
    block.container.classList.add('mdv-mermaid-failed');
    block.container.classList.remove('mdv-mermaid-ready');
    block.sourceWrap.hidden = false;
    block.sourceButton.textContent = 'Hide source';
    block.sourceButton.setAttribute('aria-expanded', 'true');
  }

  function mermaidVariables(isDark) {
    return {
      darkMode: isDark,
      background: isDark ? '#0C2040' : '#F9FBFD',
      fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      primaryColor: isDark ? '#17345F' : '#E1E9F6',
      primaryTextColor: isDark ? '#E3EBF6' : '#13233B',
      primaryBorderColor: isDark ? '#8DB8FF' : '#1F4FA0',
      lineColor: isDark ? '#9EB1CB' : '#13233B',
      secondaryColor: isDark ? '#10284A' : '#F9FBFD',
      tertiaryColor: isDark ? '#3A2537' : '#F6E3E0',
      mainBkg: isDark ? '#17345F' : '#E1E9F6',
      nodeBorder: isDark ? '#8DB8FF' : '#1F4FA0',
      clusterBkg: isDark ? '#10284A' : '#F9FBFD',
      clusterBorder: isDark ? '#2A4972' : '#C5D0DD',
      titleColor: isDark ? '#E3EBF6' : '#13233B',
      edgeLabelBackground: isDark ? '#10284A' : '#F9FBFD',
      textColor: isDark ? '#E3EBF6' : '#13233B',
      actorBkg: isDark ? '#17345F' : '#E1E9F6',
      actorBorder: isDark ? '#8DB8FF' : '#1F4FA0',
      actorTextColor: isDark ? '#E3EBF6' : '#13233B',
      actorLineColor: isDark ? '#9EB1CB' : '#56667D',
      signalColor: isDark ? '#E3EBF6' : '#13233B',
      signalTextColor: isDark ? '#E3EBF6' : '#13233B',
      labelBoxBkgColor: isDark ? '#17345F' : '#E1E9F6',
      labelBoxBorderColor: isDark ? '#8DB8FF' : '#1F4FA0',
      labelTextColor: isDark ? '#E3EBF6' : '#13233B',
      loopTextColor: isDark ? '#E3EBF6' : '#13233B',
      noteBkgColor: isDark ? '#3A2537' : '#F6E3E0',
      noteTextColor: isDark ? '#FF8E7E' : '#B03A2E',
      noteBorderColor: isDark ? '#FF8E7E' : '#B03A2E',
    };
  }

  function initialize(api, isDark) {
    api.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: mermaidVariables(isDark),
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
    });
  }

  async function renderBlock(api, block, generation) {
    block.diagram.classList.add('mdv-mermaid-loading');
    if (!block.diagram.querySelector('svg')) {
      block.diagram.textContent = 'Rendering diagram…';
    }

    try {
      const id = `mdv-mermaid-${(renderId += 1)}`;
      const result = await api.render(id, block.source);
      if (generation !== renderGeneration) return;

      const svg = MDView.sanitizeSvg(result.svg);
      if (!svg) throw new Error('Mermaid returned invalid SVG');

      block.diagram.replaceChildren(svg);
      block.diagram.classList.remove('mdv-mermaid-loading');
      block.container.classList.remove('mdv-mermaid-failed');
      block.container.classList.add('mdv-mermaid-ready');
      if (typeof result.bindFunctions === 'function') {
        result.bindFunctions(block.diagram);
      }
    } catch (error) {
      if (generation !== renderGeneration) return;
      showError(block, error?.message || String(error));
    }
  }

  async function renderMermaidBlocks(blocks, options) {
    if (!blocks || blocks.length === 0) return;

    const generation = ++renderGeneration;
    const isDark =
      typeof options?.isDark === 'function'
        ? options.isDark()
        : Boolean(options?.isDark);

    let mermaid;
    try {
      mermaid = await loadMermaid();
    } catch (error) {
      if (generation !== renderGeneration) return;
      for (const block of blocks) {
        showError(block, `could not load Mermaid (${error.message})`);
      }
      return;
    }

    if (generation !== renderGeneration) return;

    try {
      initialize(mermaid, isDark);
    } catch (error) {
      for (const block of blocks) showError(block, error.message);
      return;
    }

    for (const block of blocks) {
      if (generation !== renderGeneration) return;
      await renderBlock(mermaid, block, generation);
    }
  }

  root.MDView = Object.assign(root.MDView || {}, {
    loadMermaid,
    renderMermaidBlocks,
  });
})(globalThis);
