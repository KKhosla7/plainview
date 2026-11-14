/* global Plainview */
/*
 * Post-processing after marked: code blocks, Mermaid placeholders, tables,
 * heading ids and the table of contents source.
 */
(function (root) {
  'use strict';

  function codeLanguage(code) {
    const languageClass = [...code.classList].find((name) =>
      name.startsWith('language-'),
    );
    return languageClass ? languageClass.slice('language-'.length) : '';
  }

  function addCopyButton(code) {
    const button = Plainview.createElement('button');
    button.type = 'button';
    button.className = 'pv-copy';
    button.textContent = 'Copy';
    button.title = 'Copy code';
    button.addEventListener('click', async () => {
      const ok = await Plainview.copyText(code.textContent.replace(/\n$/, ''));
      button.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 1200);
    });
    return button;
  }

  function prepareMermaidBlock(pre, code) {
    const source = code.textContent.replace(/\n$/, '');
    const container = Plainview.createElement('figure');
    container.className = 'pv-mermaid';

    const bar = Plainview.createElement('div');
    bar.className = 'pv-code-bar';

    const label = Plainview.createElement('span');
    label.className = 'pv-code-lang';
    label.textContent = 'mermaid';

    const tools = Plainview.createElement('span');
    tools.className = 'pv-mermaid-tools';

    const sourceButton = Plainview.createElement('button');
    sourceButton.type = 'button';
    sourceButton.className = 'pv-copy';
    sourceButton.textContent = 'Source';
    sourceButton.setAttribute('aria-expanded', 'false');

    const sourceWrap = Plainview.createElement('div');
    sourceWrap.className = 'pv-mermaid-source';
    sourceWrap.hidden = true;

    const diagram = Plainview.createElement('div');
    diagram.className = 'pv-mermaid-diagram pv-mermaid-loading';
    diagram.textContent = 'Rendering diagram…';

    tools.append(sourceButton, addCopyButton(code));
    bar.append(label, tools);

    pre.replaceWith(container);
    sourceWrap.append(pre);
    container.append(bar, diagram, sourceWrap);

    sourceButton.addEventListener('click', () => {
      const open = sourceWrap.hidden;
      sourceWrap.hidden = !open;
      sourceButton.textContent = open ? 'Hide source' : 'Source';
      sourceButton.setAttribute('aria-expanded', String(open));
    });

    return { source, diagram, container, sourceWrap, sourceButton };
  }

  function enhanceCodeBlocks(article) {
    const mermaidBlocks = [];

    for (const pre of article.querySelectorAll('pre')) {
      const code = pre.querySelector('code');
      if (!code) continue;

      if (codeLanguage(code).toLowerCase() === 'mermaid') {
        mermaidBlocks.push(prepareMermaidBlock(pre, code));
        continue;
      }

      if (code.textContent.endsWith('\n')) {
        code.textContent = code.textContent.slice(0, -1);
      }

      const wrapper = Plainview.createElement('div');
      wrapper.className = 'pv-code';

      const bar = Plainview.createElement('div');
      bar.className = 'pv-code-bar';

      const label = Plainview.createElement('span');
      label.className = 'pv-code-lang';
      label.textContent = codeLanguage(code) || 'code';

      bar.append(label, addCopyButton(code));
      pre.replaceWith(wrapper);
      wrapper.append(bar, pre);
    }

    return mermaidBlocks;
  }

  function wrapTables(article) {
    for (const table of article.querySelectorAll('table')) {
      const wrapper = Plainview.createElement('div');
      wrapper.className = 'pv-table-wrap';
      table.replaceWith(wrapper);
      wrapper.append(table);
    }
  }

  function enhanceHeadings(article) {
    const used = new Set(
      [...article.querySelectorAll('[id]')].map((el) => el.id),
    );
    const nextId = Plainview.createIdFactory(used);
    const headings = [];

    for (const heading of article.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const id = nextId(text);
      heading.id = id;

      const anchor = Plainview.createElement('a');
      anchor.className = 'pv-anchor';
      anchor.href = `#${encodeURIComponent(id)}`;
      anchor.setAttribute('aria-label', `Link to section: ${text}`);
      anchor.textContent = '#';
      heading.append(anchor);

      headings.push({ id, text, level: Number(heading.tagName.slice(1)) });
    }

    return headings;
  }

  function enhanceArticle(article) {
    Plainview.sanitizeArticle(article);
    wrapTables(article);
    const mermaidBlocks = enhanceCodeBlocks(article);
    const headings = enhanceHeadings(article);
    return { headings, mermaidBlocks };
  }

  function buildMarkdown(source) {
    const article = Plainview.createElement('article');
    article.className = 'pv-doc pv-markdown';
    article.innerHTML = Plainview.renderMarkdown(source);
    const { headings, mermaidBlocks } = enhanceArticle(article);

    if (!article.hasChildNodes()) {
      const empty = Plainview.createElement('p');
      empty.className = 'pv-empty';
      empty.textContent = 'This Markdown file is empty.';
      article.append(empty);
    }

    Plainview.applyTitleBlock(article);

    return { article, headings, mermaidBlocks };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildMarkdown });
})(globalThis);
