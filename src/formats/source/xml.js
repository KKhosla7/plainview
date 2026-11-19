import { escapeHtml } from '../markdown/core.js';
import { register } from './core.js';

(() => {
  const Token =
    /(\x3C!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<\?[\s\S]*?\?>)|(<\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)(\s*\/?>)/gu;
  const Attr = /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')/gu;

  function escapeAttrBlock(block) {
    let out = '';
    let last = 0;
    Attr.lastIndex = 0;
    let match = Attr.exec(block);

    while (match) {
      out += escapeHtml(block.slice(last, match.index));
      const [, name, equals, value] = match;
      out += `<span class="pv-syn-attr">${escapeHtml(name)}</span>`;
      out += `<span class="pv-syn-punct">${escapeHtml(equals)}</span>`;
      out += `<span class="pv-syn-attr-value">${escapeHtml(value)}</span>`;
      last = match.index + match[0].length;
      match = Attr.exec(block);
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
    let match = Token.exec(source);

    while (match) {
      out += escapeHtml(source.slice(last, match.index));
      const [, comment, cdata, declaration, opening, name, attrs, closing] = match;

      if (comment) {
        out += `<span class="pv-syn-comment">${escapeHtml(comment)}</span>`;
      } else if (cdata) {
        out += `<span class="pv-syn-cdata">${escapeHtml(cdata)}</span>`;
      } else if (declaration) {
        out += `<span class="pv-syn-decl">${escapeHtml(declaration)}</span>`;
      } else {
        out += highlightTag(opening, name, attrs, closing);
      }

      last = match.index + match[0].length;
      match = Token.exec(source);
    }

    out += escapeHtml(source.slice(last));
    return out;
  }

  register('xml', highlight);
})();
