import { escapeHtml } from '../markdown/core.js';
import { register } from './core.js';

(() => {
  const ValueToken =
    /("(?:\\.|[^"\\])*"|'(?:''|[^'])*')|(#.*$)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\b(?:true|false|null|yes|no|on|off)\b)|([&*!][\w:./-]+)|([[\]{},|>?-])/giu;

  function tokenMarkup(value, className) {
    return value ? `<span class="${className}">${escapeHtml(value)}</span>` : '';
  }

  function renderValueToken({ string, comment, number, literal, reference, punctuation }) {
    const tokens = [
      [string, 'pv-syn-string'],
      [comment, 'pv-syn-comment'],
      [number, 'pv-syn-number'],
      [literal, 'pv-syn-literal'],
      [reference, 'pv-syn-attr'],
      [punctuation, 'pv-syn-punct'],
    ];
    const token = tokens.find(([value]) => value);
    return token ? tokenMarkup(token[0], token[1]) : '';
  }

  function highlightValue(text) {
    let out = '';
    let last = 0;
    ValueToken.lastIndex = 0;
    let match = ValueToken.exec(text);
    while (match) {
      out += escapeHtml(text.slice(last, match.index));
      const [, string, comment, number, literal, reference, punctuation] = match;
      out += renderValueToken({ string, comment, number, literal, reference, punctuation });
      last = match.index + match[0].length;
      match = ValueToken.exec(text);
    }

    return out + escapeHtml(text.slice(last));
  }

  function splitKey(text) {
    let quote = '';
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quote) {
        if (char === '\\' && quote === '"') {
          i += 1;
        } else if (char === quote) {
          quote = '';
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ':' && (i + 1 === text.length || /\s/u.test(text[i + 1]))) {
        return { key: text.slice(0, i), rest: text.slice(i + 1) };
      }
    }

    return null;
  }

  function highlightLine(line) {
    if (/^\s*#/u.test(line)) {
      return `<span class="pv-syn-comment">${escapeHtml(line)}</span>`;
    }

    if (/^\s*(?:---|\.\.\.)\s*$/u.test(line)) {
      return `<span class="pv-syn-fence">${escapeHtml(line)}</span>`;
    }

    const match = /^(\s*)(-\s+)?(.*)$/u.exec(line);
    if (!match) {
      return escapeHtml(line);
    }
    const [, indent, marker, rest] = match;
    if (rest.startsWith('#')) {
      return (
        escapeHtml(indent) +
        (marker ? `<span class="pv-syn-list-marker">${escapeHtml(marker)}</span>` : '') +
        `<span class="pv-syn-comment">${escapeHtml(rest)}</span>`
      );
    }

    const pair = splitKey(rest);
    if (pair) {
      return (
        escapeHtml(indent) +
        (marker ? `<span class="pv-syn-list-marker">${escapeHtml(marker)}</span>` : '') +
        `<span class="pv-syn-key">${escapeHtml(pair.key)}</span>` +
        `<span class="pv-syn-punct">:</span>` +
        highlightValue(pair.rest)
      );
    }

    return (
      escapeHtml(indent) +
      (marker ? `<span class="pv-syn-list-marker">${escapeHtml(marker)}</span>` : '') +
      highlightValue(rest)
    );
  }

  function highlight(source) {
    return source.split('\n').map(highlightLine).join('\n');
  }

  register('yaml', highlight);
})();
