/* global Plainview */
/* JSON Lines parser: one JSON value per non-empty line. */
((root) => {
  function lineError(message, line) {
    return { column: undefined, line, message };
  }

  function parseJsonl(source) {
    const text = String(source ?? '').replace(/^\uFEFF/u, '');
    const values = [];
    const lines = text.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) {
        continue;
      }

      try {
        values.push(JSON.parse(line));
      } catch (error) {
        return {
          error: lineError(error instanceof Error ? error.message : String(error), index + 1),
          values: [],
        };
      }
    }

    return { error: null, values };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { parseJsonl });
})(globalThis);
