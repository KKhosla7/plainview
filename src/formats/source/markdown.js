import { escapeHtml } from '../markdown/core.js';

import { register } from './core.js';

const GROUP_3 = 3;
const GROUP_4 = 4;

const Inline =
  /(`[^`\n]*`)|(!?\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~~[^~\n]+~~)|(<[^>\n]+>)/gu;

function inlineClass(token) {
  if (token.startsWith('**') || token.startsWith('__')) {
    return 'pv-syn-strong';
  }

  if (token.startsWith('*') || token.startsWith('_')) {
    return 'pv-syn-em';
  }

  if (token.startsWith('~~')) {
    return 'pv-syn-strike';
  }

  if (token.startsWith('<')) {
    return 'pv-syn-html';
  }

  return '';
}

function renderInlineToken(token) {
  if (token.startsWith('`')) {
    return `<span class="pv-syn-code">${escapeHtml(token)}</span>`;
  }

  if (token.startsWith('![') || token.startsWith('[')) {
    const link = /^(!?)\[([^\]]*)\]\(([^)]*)\)$/u.exec(token);
    if (link) {
      return (
        `<span class="pv-syn-link">${escapeHtml(`${link[1]}[${link[2]}]`)}</span>` +
        `<span class="pv-syn-url">${escapeHtml(`(${link[GROUP_3]})`)}</span>`
      );
    }

    return escapeHtml(token);
  }
  const className = inlineClass(token);
  return className ? `<span class="${className}">${escapeHtml(token)}</span>` : escapeHtml(token);
}

function highlightInline(text) {
  let out = '';
  let last = 0;
  Inline.lastIndex = 0;
  let match = Inline.exec(text);
  while (match) {
    out += escapeHtml(text.slice(last, match.index));
    out += renderInlineToken(match[0]);
    last = match.index + match[0].length;
    match = Inline.exec(text);
  }

  return out + escapeHtml(text.slice(last));
}

function highlightHeading(line) {
  const match = /^(\s{0,3})(#{1,6})(\s+)(.*)$/u.exec(line);
  if (!match) {
    return null;
  }

  return (
    `${escapeHtml(match[1])}` +
    `<span class="pv-syn-heading-marker">${match[2]}</span>` +
    `${escapeHtml(match[GROUP_3])}` +
    `<span class="pv-syn-heading-text">${highlightInline(match[GROUP_4])}</span>`
  );
}

function highlightList(line) {
  const match = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/u.exec(line);
  if (!match) {
    return null;
  }

  const task = /^(\[[ xX]\])(\s+)(.*)$/u.exec(match[GROUP_4]);
  if (!task) {
    return (
      `${escapeHtml(match[1])}` +
      `<span class="pv-syn-list-marker">${escapeHtml(match[2])}</span>` +
      `${escapeHtml(match[GROUP_3])}${highlightInline(match[GROUP_4])}`
    );
  }

  return (
    `${escapeHtml(match[1])}` +
    `<span class="pv-syn-list-marker">${escapeHtml(match[2])}</span>` +
    `${escapeHtml(match[GROUP_3])}` +
    `<span class="pv-syn-task">${escapeHtml(task[1])}</span>` +
    `${escapeHtml(task[2])}${highlightInline(task[GROUP_3])}`
  );
}

function highlightLine(line) {
  const fence = /^\s*(`{3,}|~{3,})(.*)$/u.exec(line);
  if (fence) {
    return { fence: true, marker: fence[1], html: null };
  }

  if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/u.test(line)) {
    return { html: `<span class="pv-syn-hr">${escapeHtml(line)}</span>` };
  }

  const heading = highlightHeading(line);
  if (heading) {
    return { html: heading };
  }

  const quote = /^(\s{0,3})(>+\s?)(.*)$/u.exec(line);
  if (quote) {
    return {
      html:
        `${escapeHtml(quote[1])}` +
        `<span class="pv-syn-quote-marker">${escapeHtml(quote[2])}</span>` +
        `${highlightInline(quote[GROUP_3])}`,
    };
  }

  const list = highlightList(line);
  if (list) {
    return { html: list };
  }

  if (/^\s*\|/u.test(line)) {
    return { html: `<span class="pv-syn-table">${highlightInline(line)}</span>` };
  }

  if (/^\s*<[^>]+>/u.test(line)) {
    return { html: `<span class="pv-syn-html">${highlightInline(line)}</span>` };
  }

  return { html: highlightInline(line) };
}

function highlight(source) {
  const out = [];
  let fenceMarker = '';

  for (const line of source.split('\n')) {
    if (fenceMarker) {
      const closing = /^\s*(`{3,}|~{3,})\s*$/u.exec(line);
      if (closing && closing[1][0] === fenceMarker[0]) {
        fenceMarker = '';
        out.push(`<span class="pv-syn-fence">${escapeHtml(line)}</span>`);
      } else {
        out.push(`<span class="pv-syn-code-line">${escapeHtml(line)}</span>`);
      }
      continue;
    }

    const result = highlightLine(line);
    if ('fence' in result) {
      fenceMarker = result.marker;
      out.push(`<span class="pv-syn-fence">${escapeHtml(line)}</span>`);
    } else {
      out.push(result.html);
    }
  }

  return out.join('\n');
}

register('markdown', highlight);
