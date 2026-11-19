import { copyText } from '../../core/clipboard.js';
import { createElement } from '../../core/dom.js';
import { onAsync } from '../../core/events.js';
import { tableResize } from '../../core/table-resize.js';
import { createIdFactory, renderMarkdown, sanitizeArticle } from './core.js';

/* global Plainview */
/*
 * Post-processing after marked: code blocks, Mermaid placeholders, tables,
 * heading ids and the table of contents source.
 */
const CopyResetMs = 1200;

function codeLanguage(code) {
  const languageClass = [...code.classList].find((name) => name.startsWith('language-'));
  return languageClass ? languageClass.slice('language-'.length) : '';
}

function addCopyButton(code) {
  const button = createElement('button');
  button.type = 'button';
  button.className = 'pv-copy';
  button.textContent = 'Copy';
  button.title = 'Copy code';
  onAsync(button, 'click', async () => {
    const ok = await copyText(code.textContent.replace(/\n$/u, ''));
    button.textContent = ok ? 'Copied' : 'Copy failed';
    globalThis.setTimeout(() => {
      button.textContent = 'Copy';
    }, CopyResetMs);
  });
  return button;
}

function createMermaidBar(code) {
  const bar = createElement('div');
  bar.className = 'pv-code-bar';
  const label = createElement('span');
  label.className = 'pv-code-lang';
  label.textContent = 'mermaid';
  const tools = createElement('span');
  tools.className = 'pv-mermaid-tools';
  const sourceButton = createElement('button');
  sourceButton.type = 'button';
  sourceButton.className = 'pv-copy';
  sourceButton.textContent = 'Source';
  sourceButton.setAttribute('aria-expanded', 'false');
  const sourceWrap = createElement('div');
  sourceWrap.className = 'pv-mermaid-source';
  sourceWrap.hidden = true;
  tools.append(sourceButton, addCopyButton(code));
  bar.append(label, tools);
  return { bar, sourceButton, sourceWrap };
}

function createMermaidDiagram() {
  const diagram = createElement('div');
  diagram.className = 'pv-mermaid-diagram pv-mermaid-loading';
  diagram.textContent = 'Rendering diagram…';
  return diagram;
}

function prepareMermaidBlock(pre, code) {
  const source = code.textContent.replace(/\n$/u, '');
  const container = createElement('figure');
  container.className = 'pv-mermaid';
  const { bar, sourceButton, sourceWrap } = createMermaidBar(code);
  const diagram = createMermaidDiagram();
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

function decorateCodeBlock(pre, code, codeBlocks) {
  if (code.textContent.endsWith('\n')) {
    code.textContent = code.textContent.slice(0, -1);
  }
  const wrapper = createElement('div');
  wrapper.className = 'pv-code';
  const bar = createElement('div');
  bar.className = 'pv-code-bar';
  const label = createElement('span');
  label.className = 'pv-code-lang';
  label.textContent = codeLanguage(code) || 'code';
  bar.append(label, addCopyButton(code));
  pre.replaceWith(wrapper);
  wrapper.append(bar, pre);
  codeBlocks.push({
    code,
    source: code.textContent,
    language: codeLanguage(code),
  });
}

function enhanceCodeBlocks(article) {
  const mermaidBlocks = [];
  const codeBlocks = [];
  for (const pre of article.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    if (!code) {
      continue;
    }

    if (codeLanguage(code).toLowerCase() === 'mermaid') {
      mermaidBlocks.push(prepareMermaidBlock(pre, code));
      continue;
    }
    decorateCodeBlock(pre, code, codeBlocks);
  }

  return { mermaidBlocks, codeBlocks };
}

function wrapTables(article) {
  let index = 0;
  for (const table of article.querySelectorAll('table')) {
    const wrapper = createElement('div');
    wrapper.className = 'pv-table-wrap';
    table.replaceWith(wrapper);
    wrapper.append(table);
    tableResize.enable(table, { tableId: `markdown-${index}` });
    index += 1;
  }
}

function enhanceHeadings(article) {
  const used = new Set([...article.querySelectorAll('[id]')].map((el) => el.id));
  const nextId = createIdFactory(used);
  const headings = [];

  for (const heading of article.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const text = (heading.textContent || '').replace(/\s+/gu, ' ').trim();
    if (!text) {
      continue;
    }

    const id = nextId(text);
    heading.id = id;

    const anchor = createElement('a');
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
  sanitizeArticle(article);
  wrapTables(article);
  const { mermaidBlocks, codeBlocks } = enhanceCodeBlocks(article);
  const headings = enhanceHeadings(article);
  return { headings, mermaidBlocks, codeBlocks };
}

function buildMarkdown(source) {
  const parsed = new DOMParser().parseFromString(renderMarkdown(source), 'text/html');
  sanitizeArticle(parsed.body);
  const article = createElement('article');
  article.className = 'pv-doc pv-markdown';
  article.append(...parsed.body.childNodes);
  const { headings, mermaidBlocks, codeBlocks } = enhanceArticle(article);

  if (!article.hasChildNodes()) {
    const empty = createElement('p');
    empty.className = 'pv-empty';
    empty.textContent = 'This Markdown file is empty.';
    article.append(empty);
  }

  Plainview.applyTitleBlock(article);

  return {
    article,
    headings,
    mermaidBlocks,
    codeBlocks,
    math: Plainview.hasMath(source),
    exportData: {
      formatId: 'markdown',
      hasFilter: () => false,
      getData(scope) {
        return scope === 'filtered' ? null : { data: source, formatId: 'markdown', kind: 'text' };
      },
    },
  };
}

export { buildMarkdown };
