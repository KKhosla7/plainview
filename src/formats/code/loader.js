/* global Plainview */
/*
 * highlight.js is bundled locally and imported only after a Markdown document
 * with a fenced code block has mounted. No code leaves the browser.
 */
((root) => {
  const AssetPath = 'vendor/highlight/highlight.min.mjs';
  const MaxAutoChars = 20_000;
  const MinAutoRelevance = 6;
  const Aliases = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    md: 'markdown',
    htm: 'xml',
    html: 'xml',
    svg: 'xml',
    c: 'c',
    h: 'c',
    'c++': 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    cs: 'csharp',
    'c#': 'csharp',
    kt: 'kotlin',
    kts: 'kotlin',
    ps1: 'powershell',
    sql: 'sql',
    jsonc: 'json',
    toml: 'ini',
  };

  let loader = null;

  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
  }

  function loadHighlight() {
    if (!loader) {
      const api = runtime();
      if (!api) {
        throw new Error('extension runtime is unavailable');
      }
      loader = import(api.getURL(AssetPath)).then((module) => {
        const hljs = module?.default ?? root.hljs;
        if (!hljs || typeof hljs.highlight !== 'function') {
          throw new Error('highlight.js did not expose a highlight() API');
        }

        return hljs;
      });
    }

    return loader;
  }

  function normalizeLanguage(language) {
    const value = String(language || '')
      .trim()
      .toLowerCase();
    return Aliases[value] || value;
  }

  function apply(hljs, block, language) {
    const result = hljs.highlight(block.source, {
      language,
      ignoreIllegals: true,
    });
    Plainview.replaceWithGeneratedHtml(block.code, result.value);
    block.code.classList.add('hljs');
    block.code.parentElement?.classList.add('pv-code-highlighted');
  }

  function applyAutoHighlight(hljs, block) {
    if (block.source.length > MaxAutoChars) {
      return;
    }
    const result = hljs.highlightAuto(block.source);
    if (result.relevance < MinAutoRelevance) {
      return;
    }
    Plainview.replaceWithGeneratedHtml(block.code, result.value);
    block.code.classList.add('hljs');
    block.code.parentElement?.classList.add('pv-code-highlighted');
  }

  async function highlightCodeBlocks(blocks) {
    if (!blocks || blocks.length === 0) {
      return;
    }

    let hljs;
    try {
      hljs = await loadHighlight();
    } catch {
      return;
    }

    for (const block of blocks) {
      const language = normalizeLanguage(block.language);
      try {
        if (language && hljs.getLanguage(language)) {
          apply(hljs, block, language);
        } else {
          applyAutoHighlight(hljs, block);
        }
      } catch {
        block.code.textContent = block.source;
      }
    }
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    highlightCodeBlocks,
  });
})(globalThis);
