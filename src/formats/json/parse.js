/* global Plainview */
((root) => {
  /**
   * Remove // and /* comments *\/ and trailing commas without touching string
   * contents. This makes .jsonc files readable without pretending to support
   * the rest of JSON5.
   */
  function readJsonString(text, start) {
    let index = start + 1;
    let escaped = false;
    while (index < text.length) {
      const char = text[index];
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        return { value: text.slice(start, index + 1), end: index + 1 };
      }
      index += 1;
    }

    return { value: text.slice(start), end: text.length };
  }

  function skipLineComment(text, start) {
    let index = start + 2;
    while (index < text.length && text[index] !== '\n') {
      index += 1;
    }

    return index;
  }

  function skipBlockComment(text, start) {
    let index = start + 2;
    let newlines = '';
    while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
      if (text[index] === '\n') {
        newlines += '\n';
      }
      index += 1;
    }

    return { newlines, end: Math.min(index + 2, text.length) };
  }

  function flushComma(out, pendingComma) {
    return pendingComma ? `${out},` : out;
  }

  function isClosingBracket(char) {
    return char === '}' || char === ']';
  }

  function readComment(text, index) {
    if (text[index] !== '/') {
      return null;
    }

    if (text[index + 1] === '/') {
      return { newlines: '', end: skipLineComment(text, index) };
    }

    if (text[index + 1] === '*') {
      return skipBlockComment(text, index);
    }

    return null;
  }

  function stripJsonComments(text) {
    let out = '';
    let index = 0;
    let pendingComma = false;

    while (index < text.length) {
      const char = text[index];

      if (char === '"') {
        out = flushComma(out, pendingComma);
        pendingComma = false;
        const string = readJsonString(text, index);
        out += string.value;
        index = string.end;
        continue;
      }

      const comment = readComment(text, index);
      if (comment) {
        out += comment.newlines;
        index = comment.end;
        continue;
      }

      if (/\s/u.test(char)) {
        out += char;
        index += 1;
        continue;
      }

      if (char === ',') {
        pendingComma = true;
        index += 1;
        continue;
      }

      if (isClosingBracket(char)) {
        pendingComma = false;
        out += char;
        index += 1;
        continue;
      }

      out = flushComma(out, pendingComma);
      pendingComma = false;
      out += char;
      index += 1;
    }

    return flushComma(out, pendingComma);
  }

  function positionFromError(message, source) {
    const position = /position\s+(\d+)/iu.exec(message);
    if (position) {
      const index = Math.min(Number(position[1]), source.length);
      const lines = source.slice(0, index).split('\n');
      return {
        position: index,
        line: lines.length,
        column: lines.at(-1).length + 1,
      };
    }

    const lineColumn = /line\s+(\d+)\s+column\s+(\d+)/iu.exec(message);
    if (lineColumn) {
      return {
        line: Number(lineColumn[1]),
        column: Number(lineColumn[2]),
      };
    }

    return {};
  }

  function parseJson(source) {
    const clean = source.replace(/^\uFEFF/u, '');
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

  const BytesPerKilobyte = 1024;
  const BytesPerMegabyte = 1024 * 1024;

  function formatBytes(bytes) {
    if (bytes < BytesPerKilobyte) {
      return `${bytes} B`;
    }

    if (bytes < BytesPerMegabyte) {
      return `${(bytes / BytesPerKilobyte).toFixed(1)} KB`;
    }

    return `${(bytes / BytesPerMegabyte).toFixed(1)} MB`;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    parseJson,
    formatBytes,
  });
})(globalThis);
