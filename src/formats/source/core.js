/* global Plainview */
((root) => {
  const MaxHighlightChars = 1_500_000;
  const highlighters = {};

  function register(format, highlighter) {
    highlighters[format] = highlighter;
  }

  function highlight(source, format) {
    const text = String(source ?? '');
    if (text.length > MaxHighlightChars) {
      return Plainview.escapeHtml(text);
    }
    const highlighter = highlighters[format];
    return highlighter ? highlighter(text) : Plainview.escapeHtml(text);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    sourceHighlight: { register, highlight },
  });
})(globalThis);
