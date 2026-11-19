import { valueKind } from '../../core/value.js';

/*
 * Maps simple path-only JMESPath expressions to JSON paths. Complex
 * expressions fall back to value matching.
 */
const Identifier = /^[A-Za-z_][\w-]*/u;
const Index = /^\[(-?\d+)\]/u;

function readQuoted(expression, start) {
  let index = start + 1;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '\\') {
      index += 2;
      continue;
    }

    if (char === '"') {
      try {
        return { key: JSON.parse(expression.slice(start, index + 1)), end: index + 1 };
      } catch {
        return null;
      }
    }
    index += 1;
  }

  return null;
}

function parseStep(expression, index) {
  if (expression[index] === '"') {
    const quoted = readQuoted(expression, index);
    return quoted ? { step: { type: 'key', key: quoted.key }, end: quoted.end } : null;
  }

  const identifier = Identifier.exec(expression.slice(index));
  if (identifier) {
    return {
      step: { type: 'key', key: identifier[0] },
      end: index + identifier[0].length,
    };
  }

  const bracket = Index.exec(expression.slice(index));
  if (bracket) {
    return {
      step: { type: 'index', index: Number(bracket[1]) },
      end: index + bracket[0].length,
    };
  }

  if (expression.startsWith('[*]', index)) {
    return { step: { type: 'wildcard' }, end: index + 3 };
  }

  return null;
}

function parsePath(expression) {
  const text = expression.trim();
  if (!text) {
    return null;
  }

  const steps = [];
  let index = 0;
  let first = true;
  while (index < text.length) {
    if (!first && text[index] === '.') {
      index += 1;
    } else if (!first && text[index] !== '[') {
      return null;
    }

    const parsed = parseStep(text, index);
    if (!parsed) {
      return null;
    }
    steps.push(parsed.step);
    index = parsed.end;
    first = false;
  }

  return steps;
}

function valueAt(rootValue, path) {
  let current = rootValue;
  for (const segment of path) {
    if (current === null || valueKind(current) !== 'object') {
      return;
    }

    if (valueKind(segment) === 'number') {
      const index = segment < 0 ? current.length + segment : segment;
      current = current[index];
    } else {
      current = current[segment];
    }
  }

  return current;
}

function expandWildcard(rootValue, paths) {
  const expanded = [];
  for (const path of paths) {
    const value = valueAt(rootValue, path);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        expanded.push([...path, index]);
      }
    }
  }

  return expanded;
}

function applyIndex(rootValue, paths, step) {
  const result = [];
  for (const path of paths) {
    const value = valueAt(rootValue, path);
    if (!Array.isArray(value)) {
      continue;
    }

    const index = step.index < 0 ? value.length + step.index : step.index;
    if (index >= 0 && index < value.length) {
      result.push([...path, index]);
    }
  }

  return result;
}

function applyStep(rootValue, paths, step) {
  if (step.type === 'index') {
    return applyIndex(rootValue, paths, step);
  }

  if (step.type === 'wildcard') {
    const expanded = expandWildcard(rootValue, paths);
    return expanded.length > 0 ? expanded : null;
  }

  return paths.map((path) => [...path, step.key]);
}

function pathsFor(rootValue, expression) {
  const steps = parsePath(expression);
  if (!steps) {
    return null;
  }

  let paths = [[]];
  for (const step of steps) {
    paths = applyStep(rootValue, paths, step);
    if (!paths) {
      return null;
    }
  }

  return paths;
}

export const jmespathPath = { pathsFor, valueAt };
