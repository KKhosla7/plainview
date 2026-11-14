/* global Plainview */
(function (root) {
  'use strict';

  const { escapeHtml } = Plainview;
  const { register } = Plainview.sourceHighlight;

  const TOKEN =
    /(<!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<\?[\s\S]*?\?>)|(<\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)(\s*\/?>)/g;
  const ATTR = /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')/g;

  function escapeAttrBlock(block) {
    let out = '';
    let last = 0;
    let match;

    ATTR.lastIndex = 0;
    while ((match = ATTR.exec(block))) {
      out += escapeHtml(block.slice(last, match.index));
      out += `<span class="pv-syn-attr">${escapeHtml(match[1])}</span>`;
      out += `<span class="pv-syn-punct">${escapeHtml(match[2])}</span>`;
      out += `<span class="pv-syn-attr-value">${escapeHtml(match[3])}</span>`;
      last = match.index + match[0].length;
    }

    out += escapeHtml(block.slice(last));
    return out;
  }

  function highlightTag(opening, name, attrs, closing) {
    return (
      `<span class="pv-syn-punct">${escapeHtml(opening)}</span>` +
      `<span class="pv-syn-tag">${escapeHtml(name)}</span>` +
      escapeAttrBlock(attrs) +
      `<span class="pv-syn-punct">${escapeHtml(closing)}</span>`
    );
  }

  function highlight(source) {
    let out = '';
    let last = 0;
    let match;

    while ((match = TOKEN.exec(source))) {
      out += escapeHtml(source.slice(last, match.index));

      if (match[1]) {
        out += `<span class="pv-syn-comment">${escapeHtml(match[1])}</span>`;
      } else if (match[2]) {
        out += `<span class="pv-syn-cdata">${escapeHtml(match[2])}</span>`;
      } else if (match[3]) {
        out += `<span class="pv-syn-decl">${escapeHtml(match[3])}</span>`;
      } else {
        out += highlightTag(match[4], match[5], match[6], match[7]);
      }

      last = match.index + match[0].length;
    }

    out += escapeHtml(source.slice(last));
    return out;
  }

  register('xml', highlight);
})(globalThis);
