import { escapeHtml } from '../markdown/core.js';

const MaxHighlightChars = 1_500_000;
const highlighters = {};

function register(format, highlighter) {
  highlighters[format] = highlighter;
}

function highlight(source, format) {
  const text = String(source ?? '');
  if (text.length > MaxHighlightChars) {
    return escapeHtml(text);
  }
  const highlighter = highlighters[format];
  return highlighter ? highlighter(text) : escapeHtml(text);
}

export { highlight, register };
