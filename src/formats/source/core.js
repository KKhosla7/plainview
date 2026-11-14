/* global Plainview */
(function (root) {
  'use strict';

  const MAX_HIGHLIGHT_CHARS = 1_500_000;
  const highlighters = {};

  function register(format, highlighter) {
    highlighters[format] = highlighter;
  }

  function highlight(source, format) {
    const text = String(source ?? '');
    if (text.length > MAX_HIGHLIGHT_CHARS) return Plainview.escapeHtml(text);
    const highlighter = highlighters[format];
    return highlighter ? highlighter(text) : Plainview.escapeHtml(text);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    sourceHighlight: { register, highlight },
  });
})(globalThis);
