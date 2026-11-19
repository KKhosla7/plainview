import { valueKind } from '../.././core/value.js';

/* global Plainview */
/*
 * JSONPath filter tokenizer and predicate parser.
 */
((root) => {
  const { fail, readQuoted, readName, readBracketContent, parseBracket } = Plainview.jsonPathParse;

  function readFilterOperator(text, index) {
    const rest = text.slice(index);
    const operator = /^(?:&&|\|\||==|!=|<=|>=|<|>|!)/u.exec(rest);
    return operator
      ? { token: { type: 'operator', value: operator[0] }, end: index + operator[0].length }
      : null;
  }

  function readFilterPathPart(text, index) {
    if (text[index] === '.') {
      const name = readName(text, index + 1);
      return { part: name.value, end: name.end };
    }

    if (text[index] === '[') {
      const bracket = readBracketContent(text, index);
      const parsed = parseBracket(bracket.value, index);
      if (parsed.type === 'child') {
        return { part: parsed.key, end: bracket.end };
      }

      if (parsed.type === 'index') {
        return { part: parsed.index, end: bracket.end };
      }
      fail('Filters only support @.key and @[index] paths');
    }

    return null;
  }

  function readFilterPath(text, index) {
    let i = index + 1;
    const parts = [];
    while (i < text.length) {
      const part = readFilterPathPart(text, i);
      if (!part) {
        break;
      }
      parts.push(part.part);
      i = part.end;
    }

    return { token: { type: 'value', value: { current: true, parts } }, end: i };
  }

  function filterWordValue(word) {
    if (word === 'true') {
      return true;
    }

    if (word === 'false') {
      return false;
    }

    if (word === 'null') {
      return null;
    }
    fail(`Unsupported filter word "${word}"`);
  }

  function readFilterLiteral(text, index) {
    const char = text[index];
    if (char === '"' || char === "'") {
      const quoted = readQuoted(text, index);
      return { token: { type: 'value', value: { literal: quoted.value } }, end: quoted.end };
    }
    const rest = text.slice(index);
    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest);
    if (number) {
      return {
        token: { type: 'value', value: { literal: Number(number[0]) } },
        end: index + number[0].length,
      };
    }
    const word = /^[A-Za-z_$][\w$]*/u.exec(rest);
    if (!word) {
      return null;
    }

    return {
      token: { type: 'value', value: { literal: filterWordValue(word[0]) } },
      end: index + word[0].length,
    };
  }

  function tokenizeFilter(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const char = text[i];
      if (/\s/u.test(char)) {
        i += 1;
        continue;
      }
      const operator = readFilterOperator(text, i);
      if (operator) {
        tokens.push(operator.token);
        i = operator.end;
        continue;
      }

      if (char === '@') {
        const path = readFilterPath(text, i);
        tokens.push(path.token);
        i = path.end;
        continue;
      }
      const literal = readFilterLiteral(text, i);
      if (literal) {
        tokens.push(literal.token);
        i = literal.end;
        continue;
      }

      if (char === '(' || char === ')') {
        tokens.push({ type: 'operator', value: char });
        i += 1;
        continue;
      }
      fail(`Unexpected filter character "${char}"`);
    }

    return tokens;
  }

  function resolveValue(token, item) {
    if (!token.current) {
      return token.literal;
    }
    let value = item;
    for (const part of token.parts) {
      if (value === null || valueKind(value) !== 'object' || !Object.hasOwn(value, part)) {
        return;
      }
      value = value[part];
    }

    return value;
  }

  function compare(left, operator, right) {
    if (operator === '==') {
      return left === right;
    }

    if (operator === '!=') {
      return left !== right;
    }

    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }

    if (operator === '<') {
      return left < right;
    }

    if (operator === '<=') {
      return left <= right;
    }

    if (operator === '>') {
      return left > right;
    }

    if (operator === '>=') {
      return left >= right;
    }

    return false;
  }

  function createFilterCursor(tokens, at) {
    let position = 0;
    return {
      at,
      peek() {
        return tokens[position];
      },
      advance() {
        position += 1;
      },
      take(value) {
        const token = this.peek();
        if (!token || token.value !== value) {
          fail(`Expected "${value}" in filter at position ${at}`);
        }
        position += 1;
        return token;
      },
      done() {
        return position === tokens.length;
      },
      nextValue() {
        return tokens[position]?.value;
      },
    };
  }

  function parseOr(cursor) {
    let left = parseAnd(cursor);
    while (cursor.nextValue() === '||') {
      cursor.advance();
      const right = parseAnd(cursor);
      const previous = left;
      left = (item) => Boolean(previous(item)) || Boolean(right(item));
    }

    return left;
  }

  function parseAnd(cursor) {
    let left = parseUnary(cursor);
    while (cursor.nextValue() === '&&') {
      cursor.advance();
      const right = parseUnary(cursor);
      const previous = left;
      left = (item) => Boolean(previous(item)) && Boolean(right(item));
    }

    return left;
  }

  function parseUnary(cursor) {
    if (cursor.nextValue() === '!') {
      cursor.advance();
      const inner = parseUnary(cursor);
      return (item) => !inner(item);
    }

    if (cursor.nextValue() === '(') {
      cursor.take('(');
      const inner = parseOr(cursor);
      cursor.take(')');
      return inner;
    }

    return parseComparison(cursor);
  }

  function parseComparison(cursor) {
    const left = parsePrimary(cursor);
    const operator = cursor.peek();
    if (
      operator?.type === 'operator' &&
      ['==', '!=', '<', '<=', '>', '>='].includes(operator.value)
    ) {
      cursor.advance();
      const right = parsePrimary(cursor);
      return (item) => compare(left(item), operator.value, right(item));
    }

    return (item) => Boolean(left(item));
  }

  function parsePrimary(cursor) {
    const token = cursor.peek();
    if (token?.type !== 'value') {
      fail(`Expected a value in filter at position ${cursor.at}`);
    }
    cursor.advance();
    return (item) => resolveValue(token.value, item);
  }

  function parseFilter(text, at) {
    const cursor = createFilterCursor(tokenizeFilter(text), at);
    const predicate = parseOr(cursor);
    if (!cursor.done()) {
      fail(`Unexpected filter token "${cursor.peek()?.value}"`);
    }

    return predicate;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonPathFilter: { parseFilter },
  });
})(globalThis);
