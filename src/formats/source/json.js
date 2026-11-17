/* global Plainview */
(() => {
  const { escapeHtml } = Plainview;
  const { register } = Plainview.sourceHighlight;

  const Token =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/gu;

  function tokenMarkup(value, className) {
    return value ? `<span class="${className}">${escapeHtml(value)}</span>` : '';
  }

  function renderToken({ comment, key, string, number, literal, punctuation }) {
    const tokens = [
      [comment, 'pv-syn-comment'],
      [key, 'pv-syn-key'],
      [string, 'pv-syn-string'],
      [number, 'pv-syn-number'],
      [literal, 'pv-syn-literal'],
      [punctuation, 'pv-syn-punct'],
    ];
    const token = tokens.find(([value]) => value);
    return token ? tokenMarkup(token[0], token[1]) : '';
  }

  function highlight(source) {
    let out = '';
    let last = 0;
    let match = Token.exec(source);
    while (match) {
      out += escapeHtml(source.slice(last, match.index));
      const [, comment, key, string, number, literal, punctuation] = match;
      out += renderToken({ comment, key, string, number, literal, punctuation });
      last = match.index + match[0].length;
      match = Token.exec(source);
    }

    return out + escapeHtml(source.slice(last));
  }

  register('json', highlight);
})();
