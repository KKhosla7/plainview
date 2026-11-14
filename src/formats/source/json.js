/* global Plainview */
(function () {
  'use strict';

  const { escapeHtml } = Plainview;
  const { register } = Plainview.sourceHighlight;

  const TOKEN =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

  function highlight(source) {
    let out = '';
    let last = 0;
    let match;

    while ((match = TOKEN.exec(source))) {
      out += escapeHtml(source.slice(last, match.index));

      if (match[1]) {
        out += `<span class="pv-syn-comment">${escapeHtml(match[1])}</span>`;
      } else if (match[2]) {
        out += `<span class="pv-syn-key">${escapeHtml(match[2])}</span>`;
      } else if (match[3]) {
        out += `<span class="pv-syn-string">${escapeHtml(match[3])}</span>`;
      } else if (match[4]) {
        out += `<span class="pv-syn-number">${escapeHtml(match[4])}</span>`;
      } else if (match[5]) {
        out += `<span class="pv-syn-literal">${escapeHtml(match[5])}</span>`;
      } else if (match[6]) {
        out += `<span class="pv-syn-punct">${escapeHtml(match[6])}</span>`;
      }

      last = match.index + match[0].length;
    }

    out += escapeHtml(source.slice(last));
    return out;
  }

  register('json', highlight);
})();
