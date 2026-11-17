/* global Plainview */
/*
 * KaTeX is bundled locally and loaded only for Markdown that contains math.
 * CSS and fonts are local extension resources, not a CDN request.
 */
((root) => {
  const AssetPath = 'vendor/katex/katex.min.mjs';
  const CssPath = 'vendor/katex/katex.min.css';
  const MathPattern =
    /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\$(?!\s)[^$\n]+?(?<!\s)\$/u;

  let loader = null;
  let cssInstalled = false;

  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
  }

  function hasMath(source) {
    return MathPattern.test(String(source ?? ''));
  }

  function installCss() {
    if (cssInstalled) {
      return;
    }
    cssInstalled = true;
    const api = runtime();
    if (!(api && document.head)) {
      return;
    }
    const link = Plainview.createElement('link');
    link.rel = 'stylesheet';
    link.href = api.getURL(CssPath);
    link.setAttribute('data-pv-katex', '');
    document.head.append(link);
  }

  function loadKatex() {
    if (!loader) {
      const api = runtime();
      if (!api) {
        throw new Error('extension runtime is unavailable');
      }
      loader = import(api.getURL(AssetPath)).then((module) => {
        if (!module || typeof module.renderMathInElement !== 'function') {
          throw new Error('KaTeX did not expose renderMathInElement()');
        }

        return module;
      });
    }

    return loader;
  }

  async function renderMath(article, options = {}) {
    if (!article || options.enabled === false) {
      return;
    }
    let katex;
    try {
      katex = await loadKatex();
    } catch {
      article.classList.add('pv-math-error');
    }
    installCss();
    try {
      katex.renderMathInElement(article, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
        errorColor: '#b03a2e',
        ignoredClasses: ['pv-raw-html'],
      });
      article.classList.add('pv-math-ready');
    } catch {
      article.classList.add('pv-math-error');
    }
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    hasMath,
    renderMath,
  });
})(globalThis);
