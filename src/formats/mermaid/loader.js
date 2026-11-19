import { createElement } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';

/* global Plainview */
/*
 * Mermaid is loaded lazily: pages without a ```mermaid block never pay the
 * download/parse cost.
 *
 * Firefox content scripts run under the extension CSP, which blocks
 * Function("return this") used by mermaid's lodash chunk. The vendor build
 * rewrites that one expression to globalThis.
 */
((root) => {
  const AssetPath = 'vendor/mermaid/mermaid.esm.min.mjs';
  let loader = null;
  let renderGeneration = 0;
  let renderId = 0;

  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
  }

  function loadMermaid() {
    if (!loader) {
      const api = runtime();
      if (!api) {
        throw new Error('extension runtime is unavailable');
      }
      loader = import(api.getURL(AssetPath)).then((module) => {
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
    const panel = createElement('div');
    panel.className = 'pv-mermaid-error';
    panel.textContent = `Diagram error: ${message}`;
    block.diagram.replaceChildren(panel);
    block.container.classList.add('pv-mermaid-failed');
    block.container.classList.remove('pv-mermaid-ready');
    block.sourceWrap.hidden = false;
    block.sourceButton.textContent = 'Hide source';
    block.sourceButton.setAttribute('aria-expanded', 'true');
  }

  const LightVariables = {
    darkMode: false,
    background: '#F9FBFD',
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    primaryColor: '#E1E9F6',
    primaryTextColor: '#13233B',
    primaryBorderColor: '#1F4FA0',
    lineColor: '#13233B',
    secondaryColor: '#F9FBFD',
    tertiaryColor: '#F6E3E0',
    mainBkg: '#E1E9F6',
    nodeBorder: '#1F4FA0',
    clusterBkg: '#F9FBFD',
    clusterBorder: '#C5D0DD',
    titleColor: '#13233B',
    edgeLabelBackground: '#F9FBFD',
    textColor: '#13233B',
    actorBkg: '#E1E9F6',
    actorBorder: '#1F4FA0',
    actorTextColor: '#13233B',
    actorLineColor: '#56667D',
    signalColor: '#13233B',
    signalTextColor: '#13233B',
    labelBoxBkgColor: '#E1E9F6',
    labelBoxBorderColor: '#1F4FA0',
    labelTextColor: '#13233B',
    loopTextColor: '#13233B',
    noteBkgColor: '#F6E3E0',
    noteTextColor: '#B03A2E',
    noteBorderColor: '#B03A2E',
  };

  const DarkVariables = {
    ...LightVariables,
    darkMode: true,
    background: '#0C2040',
    primaryColor: '#17345F',
    primaryTextColor: '#E3EBF6',
    primaryBorderColor: '#8DB8FF',
    lineColor: '#9EB1CB',
    secondaryColor: '#10284A',
    tertiaryColor: '#3A2537',
    mainBkg: '#17345F',
    nodeBorder: '#8DB8FF',
    clusterBkg: '#10284A',
    clusterBorder: '#2A4972',
    titleColor: '#E3EBF6',
    edgeLabelBackground: '#10284A',
    textColor: '#E3EBF6',
    actorBkg: '#17345F',
    actorBorder: '#8DB8FF',
    actorTextColor: '#E3EBF6',
    actorLineColor: '#9EB1CB',
    signalColor: '#E3EBF6',
    signalTextColor: '#E3EBF6',
    labelBoxBkgColor: '#17345F',
    labelBoxBorderColor: '#8DB8FF',
    labelTextColor: '#E3EBF6',
    loopTextColor: '#E3EBF6',
    noteBkgColor: '#3A2537',
    noteTextColor: '#FF8E7E',
    noteBorderColor: '#FF8E7E',
  };

  function mermaidVariables(isDark) {
    return isDark ? DarkVariables : LightVariables;
  }

  function initialize(api, isDark) {
    api.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: mermaidVariables(isDark),
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
    });
  }

  async function renderBlock(api, block, generation) {
    block.diagram.classList.add('pv-mermaid-loading');
    if (!block.diagram.querySelector('svg')) {
      block.diagram.textContent = 'Rendering diagram…';
    }

    try {
      renderId += 1;
      const id = `pv-mermaid-${renderId}`;
      const result = await api.render(id, block.source);
      if (generation !== renderGeneration) {
        return;
      }

      const svg = Plainview.sanitizeSvg(result.svg);
      if (!svg) {
        throw new Error('Mermaid returned invalid SVG');
      }

      block.diagram.replaceChildren(svg);
      block.diagram.classList.remove('pv-mermaid-loading');
      block.container.classList.remove('pv-mermaid-failed');
      block.container.classList.add('pv-mermaid-ready');
      if (typeof result.bindFunctions === 'function') {
        result.bindFunctions(block.diagram);
      }
    } catch (error) {
      if (generation !== renderGeneration) {
        return;
      }
      showError(block, error instanceof Error ? error.message : String(error));
    }
  }

  async function renderMermaidBlocks(blocks, options) {
    if (!blocks || blocks.length === 0) {
      return;
    }

    renderGeneration += 1;
    const generation = renderGeneration;
    const isDark =
      valueKind(options?.isDark) === 'function' ? options.isDark() : Boolean(options?.isDark);

    let mermaid;
    try {
      mermaid = await loadMermaid();
    } catch (error) {
      if (generation !== renderGeneration) {
        return;
      }

      for (const block of blocks) {
        showError(block, `could not load Mermaid (${error.message})`);
      }

      return;
    }

    if (generation !== renderGeneration) {
      return;
    }

    try {
      initialize(mermaid, isDark);
    } catch (error) {
      for (const block of blocks) {
        showError(block, error.message);
      }

      return;
    }

    async function renderSequentially(index) {
      if (index >= blocks.length || generation !== renderGeneration) {
        return;
      }

      await renderBlock(mermaid, blocks[index], generation);
      await renderSequentially(index + 1);
    }

    await renderSequentially(0);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    renderMermaidBlocks,
  });
})(globalThis);
