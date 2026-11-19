/* global Plainview */
/*
 * RFC 4180-style CSV/TSV parsing with quoted fields, escaped quotes and
 * embedded newlines. Parsing is bounded so a malformed or enormous file can
 * never build an unbounded table.
 */
const MaxRows = 5000;
const MaxColumns = 200;

function detectDelimiter(source, preferred) {
  if (preferred) {
    return preferred;
  }
  const line = source.split(/\r?\n/u, 1)[0] || '';
  const counts = { ',': 0, '\t': 0, ';': 0, '|': 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char in counts) {
      counts[char] += 1;
    }
  }
  let best = ',';
  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > counts[best]) {
      best = delimiter;
    }
  }

  return best;
}

function consumeQuotedField(text, start, startLine) {
  let field = '';
  let line = startLine;
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      if (text[index + 1] === '"') {
        field += '"';
        index += 2;
        continue;
      }

      return { field, end: index + 1, line, closed: true };
    }

    if (char === '\n') {
      line += 1;
    }
    field += char;
    index += 1;
  }

  return { field, end: index, line, closed: false };
}

function createState(text, delimiter) {
  return {
    text,
    delimiter,
    rows: [],
    row: [],
    field: '',
    line: 1,
    columnsTruncated: false,
    rowsTruncated: false,
    error: null,
  };
}

function pushField(state) {
  if (state.row.length >= MaxColumns) {
    state.columnsTruncated = true;
    return;
  }
  state.row.push(state.field);
  state.field = '';
}

function pushRow(state) {
  pushField(state);
  if (state.rows.length >= MaxRows) {
    state.rowsTruncated = true;
    state.row = [];
    return;
  }
  state.rows.push(state.row);
  state.row = [];
}

function consumeQuoted(state, index) {
  const parsed = consumeQuotedField(state.text, index, state.line);
  state.field = parsed.field;
  state.line = parsed.line;
  if (!parsed.closed) {
    state.error = { message: 'Unterminated quoted field', line: state.line };
    return -1;
  }

  return parsed.end;
}

function consumeLineBreak(state, index) {
  let next = index;
  if (state.text[index] === '\r' && state.text[index + 1] === '\n') {
    next += 1;
  }
  pushRow(state);
  state.line += 1;
  return { next, stop: state.rowsTruncated };
}

function parseCsv(source, options = {}) {
  const text = String(source ?? '').replace(/^\uFEFF/u, '');
  const delimiter = detectDelimiter(text, options.delimiter);
  const state = createState(text, delimiter);

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && state.field.length === 0) {
      const end = consumeQuoted(state, i);
      if (end < 0) {
        break;
      }
      i = end - 1;
      continue;
    }

    if (char === state.delimiter) {
      pushField(state);
      continue;
    }

    if (char === '\r' || char === '\n') {
      const result = consumeLineBreak(state, i);
      i = result.next;
      if (result.stop) {
        break;
      }
      continue;
    }
    state.field += char;
  }

  if (state.field.length > 0 || state.row.length > 0) {
    pushRow(state);
  }

  return {
    rows: state.rows,
    delimiter: state.delimiter,
    line: state.line,
    error: state.error,
    rowsTruncated: state.rowsTruncated,
    columnsTruncated: state.columnsTruncated,
    maxRows: MaxRows,
    maxColumns: MaxColumns,
  };
}

export const csvLimits = { MaxRows, MaxColumns };

export { parseCsv };
