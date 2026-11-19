import { escapeHtml } from '../markdown/core.js';
import { register } from './core.js';

/* global Plainview */
(() => {
  function consumeQuotedField(source, start) {
    let value = '"';
    let index = start + 1;
    while (index < source.length) {
      const char = source[index];
      value += char;
      if (char === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 2;
          continue;
        }

        return { value, end: index + 1 };
      }
      index += 1;
    }

    return { value, end: index };
  }

  function highlight(source) {
    let out = '';
    let plain = '';
    let fieldStart = true;

    function flushPlain() {
      out += escapeHtml(plain);
      plain = '';
    }

    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === '"' && fieldStart) {
        flushPlain();
        const quoted = consumeQuotedField(source, i);
        out += `<span class="pv-syn-string">${escapeHtml(quoted.value)}</span>`;
        i = quoted.end - 1;
        fieldStart = false;
        continue;
      }

      if (char === ',' || char === '\t' || char === ';' || char === '|') {
        flushPlain();
        out += `<span class="pv-syn-punct">${escapeHtml(char)}</span>`;
        fieldStart = true;
        continue;
      }

      if (char === '\r' || char === '\n') {
        flushPlain();
        out += escapeHtml(char);
        fieldStart = true;
        continue;
      }
      plain += char;
      if (char.trim() !== '') {
        fieldStart = false;
      }
    }

    flushPlain();
    return out;
  }

  register('csv', highlight);
})();
