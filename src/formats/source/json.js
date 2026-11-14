/* global Plainview */
(() => {
  const { escapeHtml } = Plainview;
  const { register } = Plainview.sourceHighlight;

  const Token =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/gu;

  function highlight(source) {
    let out = '';
    let last = 0;
    let match = Token.exec(source);

    while (match) {
      out += escapeHtml(source.slice(last, match.index));
      const [, comment, key, string, number, literal, punctuation] = match;

      if (comment) {
        out += `<span class="pv-syn-comment">${escapeHtml(comment)}</span>`;
      } else if (key) {
        out += `<span class="pv-syn-key">${escapeHtml(key)}</span>`;
      } else if (string) {
        out += `<span class="pv-syn-string">${escapeHtml(string)}</span>`;
      } else if (number) {
        out += `<span class="pv-syn-number">${escapeHtml(number)}</span>`;
      } else if (literal) {
        out += `<span class="pv-syn-literal">${escapeHtml(literal)}</span>`;
      } else if (punctuation) {
        out += `<span class="pv-syn-punct">${escapeHtml(punctuation)}</span>`;
      }

      last = match.index + match[0].length;
      match = Token.exec(source);
    }

    out += escapeHtml(source.slice(last));
    return out;
  }

  register('json', highlight);
})();
