/* A small safe JSONPath subset over plain data; JavaScript is never evaluated. */
const MaxResults = 2000;
const Identifier = /^[A-Za-z_$][\w$]*$/u;

function fail(message) {
  throw new Error(message);
}

function readQuoted(text, index) {
  const quote = text[index];
  let value = '';
  let i = index + 1;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\') {
      const next = text[i + 1];
      if (next === undefined) {
        fail('Unterminated escape in quoted key');
      }
      const escapes = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '/': '/',
        '\\': '\\',
        '"': '"',
        "'": "'",
      };
      value += escapes[next] ?? next;
      i += 2;
      continue;
    }

    if (char === quote) {
      return { value, end: i + 1 };
    }
    value += char;
    i += 1;
  }
  fail('Unterminated quoted key');
}

function readName(text, index) {
  let i = index;
  while (i < text.length && /[\w$-]/u.test(text[i])) {
    i += 1;
  }

  if (i === index) {
    fail(`Expected a key name at position ${index}`);
  }

  return { value: text.slice(index, i), end: i };
}

function consumeBracketQuotedChar(text, index, quote) {
  const char = text[index];
  if (char !== '\\') {
    return { value: char, end: index + 1, closed: char === quote };
  }
  const next = text[index + 1];
  return {
    value: char + (next ?? ''),
    end: next === undefined ? index + 1 : index + 2,
    closed: false,
  };
}

function readBracketContent(text, index) {
  let i = index + 1;
  let depth = 1;
  let quote = '';
  let value = '';
  while (i < text.length) {
    const char = text[i];
    if (quote) {
      const quoted = consumeBracketQuotedChar(text, i, quote);
      value += quoted.value;
      i = quoted.end;
      if (quoted.closed) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      value += char;
      i += 1;
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return { value: value.trim(), end: i + 1 };
      }
    }
    value += char;
    i += 1;
  }
  fail('Missing closing ]');
}

function skipQuoted(value, index, quote) {
  let i = index + 1;
  while (i < value.length) {
    if (value[i] === '\\') {
      i += 2;
      continue;
    }

    if (value[i] === quote) {
      return i + 1;
    }
    i += 1;
  }

  return i;
}

function splitUnion(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '"' || char === "'") {
      i = skipQuoted(value, i, char) - 1;
      continue;
    }

    if (char === '(' || char === '[') {
      depth += 1;
      continue;
    }

    if (char === ')' || char === ']') {
      depth -= 1;
      continue;
    }

    if (char === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function parseSlice(value) {
  const [start, end, step] = value.split(':');
  return {
    type: 'slice',
    start: start === '' ? null : Number(start),
    end: end === '' ? null : Number(end),
    step: step === undefined || step === '' ? 1 : Number(step),
  };
}

function parseBracketKey(value) {
  if (value.startsWith('"') || value.startsWith("'")) {
    const quoted = readQuoted(value, 0);
    if (quoted.end !== value.length) {
      fail('Unexpected text after quoted key');
    }

    return quoted.value;
  }

  if (Identifier.test(value)) {
    return value;
  }
  fail(`Unsupported bracket expression [${value}]`);
}

function parseBracketUnion(value, at, parseFilter) {
  const union = splitUnion(value);
  if (union.length <= 1) {
    return null;
  }

  return {
    type: 'union',
    parts: union.map((part) => parseBracket(part, at, parseFilter)),
  };
}

function parseBracket(value, at, parseFilter) {
  if (value === '*') {
    return { type: 'wildcard' };
  }

  if (value.startsWith('?')) {
    return {
      type: 'filter',
      expression: parseFilter(value.slice(1).trim(), at),
    };
  }

  if (/^-?\d+$/u.test(value)) {
    return { type: 'index', index: Number(value) };
  }

  if (/^-?\d*:-?\d*(?::-?\d*)?$/u.test(value)) {
    return parseSlice(value);
  }
  const union = parseBracketUnion(value, at, parseFilter);
  if (union) {
    return union;
  }

  return { type: 'child', key: parseBracketKey(value) };
}

function readDotToken(text, index) {
  if (text[index + 1] === '.') {
    const next = index + 2;
    if (text[next] === '*') {
      return { token: { type: 'recursive-wildcard' }, end: next + 1 };
    }
    const name = readName(text, next);
    return { token: { type: 'recursive', key: name.value }, end: name.end };
  }
  const next = index + 1;
  if (text[next] === '*') {
    return { token: { type: 'wildcard' }, end: next + 1 };
  }
  const name = readName(text, next);
  return { token: { type: 'child', key: name.value }, end: name.end };
}

function readBracketToken(text, index, parseFilter) {
  const bracket = readBracketContent(text, index);
  return {
    token: parseBracket(bracket.value, index, parseFilter),
    end: bracket.end,
  };
}

function tokenize(expression, parseFilter) {
  const text = String(expression ?? '').trim();
  if (!text.startsWith('$')) {
    fail('JSONPath must start with $');
  }
  const tokens = [];
  let i = 1;
  while (i < text.length) {
    const char = text[i];
    if (/\s/u.test(char)) {
      i += 1;
    } else if (char === '.' || char === '[') {
      const result = char === '.' ? readDotToken(text, i) : readBracketToken(text, i, parseFilter);
      tokens.push(result.token);
      i = result.end;
    } else {
      fail(`Unexpected character "${char}" at position ${i}`);
    }
  }

  return tokens;
}

export const jsonPathParse = {
  MaxResults,
  Identifier,
  fail,
  readQuoted,
  readName,
  readBracketContent,
  parseBracket,
  tokenize,
};
