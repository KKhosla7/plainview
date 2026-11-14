/* global Plainview */
(function (root) {
  'use strict';

  /**
   * Remove // and /* comments *\/ and trailing commas without touching string
   * contents. This makes .jsonc files readable without pretending to support
   * the rest of JSON5.
   */
  function stripJsonComments(text) {
    let out = '';
    let i = 0;
    let inString = false;
    let escaped = false;
    let pendingComma = false;

    while (i < text.length) {
      const ch = text[i];

      if (inString) {
        out += ch;
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        i += 1;
        continue;
      }

      if (ch === '"') {
        if (pendingComma) {
          out += ',';
          pendingComma = false;
        }
        inString = true;
        out += ch;
        i += 1;
        continue;
      }

      if (ch === '/' && text[i + 1] === '/') {
        i += 2;
        while (i < text.length && text[i] !== '\n') i += 1;
        continue;
      }

      if (ch === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
          if (text[i] === '\n') out += '\n';
          i += 1;
        }
        i += 2;
        continue;
      }

      if (/\s/.test(ch)) {
        out += ch;
        i += 1;
        continue;
      }

      if (ch === ',') {
        pendingComma = true;
        i += 1;
        continue;
      }

      if (ch === '}' || ch === ']') {
        pendingComma = false;
        out += ch;
        i += 1;
        continue;
      }

      if (pendingComma) {
        out += ',';
        pendingComma = false;
      }

      out += ch;
      i += 1;
    }

    if (pendingComma) out += ',';
    return out;
  }

  function positionFromError(message, source) {
    const position = /position\s+(\d+)/i.exec(message);
    if (position) {
      const index = Math.min(Number(position[1]), source.length);
      const lines = source.slice(0, index).split('\n');
      return {
        position: index,
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
      };
    }

    const lineColumn = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
    if (lineColumn) {
      return {
        line: Number(lineColumn[1]),
        column: Number(lineColumn[2]),
      };
    }

    return {};
  }

  function parseJson(source) {
    const clean = source.replace(/^\uFEFF/, '');
    try {
      return { value: JSON.parse(clean) };
    } catch (firstError) {
      const stripped = stripJsonComments(clean);
      if (stripped === clean) {
        return {
          error: {
            message: firstError.message,
            ...positionFromError(firstError.message, clean),
          },
        };
      }
      try {
        return { value: JSON.parse(stripped), jsonc: true };
      } catch {
        return {
          error: {
            message: firstError.message,
            ...positionFromError(firstError.message, clean),
          },
        };
      }
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    parseJson,
    stripJsonComments,
    formatBytes,
  });
})(globalThis);
