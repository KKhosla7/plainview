import { valueKind } from '../../core/value.js';
import { jsonPathParse } from './jsonpath.js';
import { parseFilter } from './jsonpath-filter.js';

const { fail, Identifier, MaxResults, tokenize } = jsonPathParse;

/*
 * JSONPath evaluation over plain data.
 */

function quoteKey(key) {
  return JSON.stringify(String(key));
}

function pathToJsonPath(parts) {
  let out = '$';
  for (const part of parts) {
    if (valueKind(part) === 'number') {
      out += `[${part}]`;
    } else if (Identifier.test(part)) {
      out += `.${part}`;
    } else {
      out += `[${quoteKey(part)}]`;
    }
  }

  return out;
}

function childNodes(node) {
  if (node.value === null || valueKind(node.value) !== 'object') {
    return [];
  }

  if (Array.isArray(node.value)) {
    return node.value.map((value, index) => ({
      value,
      path: [...node.path, index],
    }));
  }

  return Object.entries(node.value).map(([key, value]) => ({
    value,
    path: [...node.path, key],
  }));
}

function descend(node, visit, seen = new WeakSet()) {
  if (node.value !== null && valueKind(node.value) === 'object') {
    if (seen.has(node.value)) {
      return;
    }
    seen.add(node.value);
  }

  for (const child of childNodes(node)) {
    visit(child);
    descend(child, visit, seen);
  }
}

function isObjectValue(value) {
  return value !== null && valueKind(value) === 'object';
}

function applyChildStep(node, token) {
  const { value, path } = node;
  if (!isObjectValue(value)) {
    return [];
  }

  if (!Object.hasOwn(value, token.key)) {
    return [];
  }

  return [{ value: value[token.key], path: [...path, token.key] }];
}

function applyIndexStep(node, token) {
  const { value, path } = node;
  if (!Array.isArray(value)) {
    return [];
  }

  const index = token.index < 0 ? value.length + token.index : token.index;
  if (index < 0 || index >= value.length) {
    return [];
  }

  return [{ value: value[index], path: [...path, index] }];
}

function collectSlice(value, path, start, end, step) {
  const out = [];
  for (let index = start; step > 0 ? index < end : index > end; index += step) {
    if (index >= 0 && index < value.length) {
      out.push({ value: value[index], path: [...path, index] });
    }
  }

  return out;
}

function applySliceStep(node, token) {
  const { value, path } = node;
  if (!Array.isArray(value)) {
    return [];
  }

  const { step } = token;
  if (step === 0) {
    fail('Slice step cannot be zero');
  }
  const { length } = value;
  let start = token.start ?? (step > 0 ? 0 : length - 1);
  let end = token.end ?? (step > 0 ? length : -1);
  if (start < 0) {
    start += length;
  }

  if (end < 0 && token.end !== null) {
    end += length;
  }

  if (step > 0) {
    start = Math.max(0, start);
    end = Math.min(length, end);
  } else {
    start = Math.min(length - 1, start);
  }

  return collectSlice(value, path, start, end, step);
}

function applyUnionStep(node, token) {
  return token.parts.flatMap((part) => applyStep([node], part));
}

function applyRecursiveStep(node, token) {
  const out = [];
  descend(node, (child) => {
    if (child.path.at(-1) === token.key) {
      out.push(child);
    }
  });
  return out;
}

function applyRecursiveWildcardStep(node) {
  const out = [];
  descend(node, (child) => out.push(child));
  return out;
}

function applyFilterStep(node, token) {
  return childNodes(node).filter((child) => token.expression(child.value));
}

const StepHandlers = {
  child: applyChildStep,
  index: applyIndexStep,
  wildcard: (node) => childNodes(node),
  slice: applySliceStep,
  union: applyUnionStep,
  recursive: applyRecursiveStep,
  'recursive-wildcard': applyRecursiveWildcardStep,
  filter: applyFilterStep,
};

function applyStep(nodes, token) {
  const handler = StepHandlers[token.type];
  if (!handler) {
    fail(`Unsupported JSONPath token "${token.type}"`);
  }

  return nodes.flatMap((node) => handler(node, token));
}

function evaluate(rootValue, expression) {
  const tokens = tokenize(expression, parseFilter);
  let nodes = [{ value: rootValue, path: [] }];
  for (const token of tokens) {
    nodes = applyStep(nodes, token);
    if (nodes.length > MaxResults) {
      fail(`Query matched more than ${MaxResults.toLocaleString()} values`);
    }

    if (nodes.length === 0) {
      break;
    }
  }

  return nodes;
}

export const jsonPath = { evaluate, pathToJsonPath };
