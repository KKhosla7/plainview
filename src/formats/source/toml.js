import { escapeHtml } from '../markdown/core.js';
import { register } from './core.js';

/* global Plainview */
(() => {
  const ValueToken =
    /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'[^']*')|(#.*$)|(\b(?:true|false)\b)|(-?\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})?)?)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([[\]{},.=])/gu;

  function tokenMarkup(value, className) {
    return value ? `<span class="${className}">${escapeHtml(value)}</span>` : '';
  }

  function renderValueToken({ string, comment, literal, date, number, punctuation }) {
    const tokens = [
      [string, 'pv-syn-string'],
      [comment, 'pv-syn-comment'],
      [literal, 'pv-syn-literal'],
      [date || number, 'pv-syn-number'],
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
      const [, string, comment, literal, date, number, punctuation] = match;
      out += renderValueToken({ string, comment, literal, date, number, punctuation });
      last = match.index + match[0].length;
      match = ValueToken.exec(text);
    }

    return out + escapeHtml(text.slice(last));
  }

  function highlightLine(line) {
    if (/^\s*#/u.test(line)) {
      return `<span class="pv-syn-comment">${escapeHtml(line)}</span>`;
    }
    const table = /^(\s*)(\[\[?)([^\]]+)(\]\]?)\s*(#.*)?$/u.exec(line);
    if (table) {
      return (
        escapeHtml(table[1]) +
        `<span class="pv-syn-punct">${escapeHtml(table[2])}</span>` +
        `<span class="pv-syn-key">${escapeHtml(table[3])}</span>` +
        `<span class="pv-syn-punct">${escapeHtml(table[4])}</span>` +
        (table[5] ? ` <span class="pv-syn-comment">${escapeHtml(table[5])}</span>` : '')
      );
    }
    const pair = /^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)(.*)$/u.exec(line);
    if (pair) {
      return (
        escapeHtml(pair[1]) +
        `<span class="pv-syn-key">${escapeHtml(pair[2])}</span>` +
        `<span class="pv-syn-punct">${escapeHtml(pair[3])}</span>` +
        highlightValue(pair[4])
      );
    }

    return highlightValue(line);
  }

  function highlight(source) {
    return source.split('\n').map(highlightLine).join('\n');
  }

  register('toml', highlight);
})();
