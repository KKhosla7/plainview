/* global MDView */
(function (root) {
  'use strict';

  const MAX_HIGHLIGHT_CHARS = 1_500_000;
  const highlighters = {};

  function register(format, highlighter) {
    highlighters[format] = highlighter;
  }

  function highlight(source, format) {
    const text = String(source ?? '');
    if (text.length > MAX_HIGHLIGHT_CHARS) return MDView.escapeHtml(text);
    const highlighter = highlighters[format];
    return highlighter ? highlighter(text) : MDView.escapeHtml(text);
  }

  root.MDView = Object.assign(root.MDView || {}, {
    sourceHighlight: { register, highlight },
  });
})(globalThis);
