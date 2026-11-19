import { valueKind } from '../../core/value.js';
import { jsonPath } from './jsonpath-eval.js';

function valueClass(value) {
  if (value === null) {
    return 'pv-json-null';
  }

  if (valueKind(value) === 'string') {
    return 'pv-json-string';
  }

  if (valueKind(value) === 'number') {
    return 'pv-json-number';
  }

  if (valueKind(value) === 'boolean') {
    return 'pv-json-boolean';
  }

  return 'pv-json-boolean';
}

function treeSyntax(formatId) {
  if (formatId === 'yaml') {
    return 'yaml';
  }

  return formatId === 'jsonl' ? 'jsonl' : '';
}

const JsonlFormatCache = new Map();
const MAX_JSONL_FORMAT_CACHE_VALUE = 250;
const MaxJsonlFormatCache = MAX_JSONL_FORMAT_CACHE_VALUE;

function formattedJsonlValue(value) {
  if (JsonlFormatCache.has(value)) {
    return JsonlFormatCache.get(value);
  }

  const trimmed = value.trim();
  let formatted = JSON.stringify(value).replaceAll('\\n', '\n').replaceAll('\\t', '\t');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      formatted = JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      formatted = value;
    }
  }

  if (JsonlFormatCache.size >= MaxJsonlFormatCache) {
    JsonlFormatCache.delete(JsonlFormatCache.keys().next().value);
  }

  JsonlFormatCache.set(value, formatted);
  return formatted;
}

function renderValue(value, syntax) {
  if (valueKind(value) === 'string') {
    if (syntax === 'yaml') {
      return value;
    }

    if (document.documentElement.dataset.pvFormatValues !== 'off') {
      return JSON.stringify(value).replaceAll('\\n', '\n').replaceAll('\\t', '\t');
    }

    if (syntax === 'jsonl') {
      return formattedJsonlValue(value);
    }

    return JSON.stringify(value);
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

function pathTextFor(path) {
  return jsonPath.pathToJsonPath(path);
}

function isContainer(value) {
  return value !== null && valueKind(value) === 'object';
}

function entryCount(value) {
  return Array.isArray(value) ? value.length : Object.keys(value).length;
}

function childEntries(value, index) {
  if (Array.isArray(value)) {
    return [index, value[index]];
  }

  const key = Object.keys(value)[index];
  return [key, value[key]];
}

function keyIndex(state, segment) {
  if (state.array) {
    return Number(segment);
  }

  return state.keys.indexOf(String(segment));
}

export {
  childEntries,
  entryCount,
  isContainer,
  keyIndex,
  pathTextFor,
  renderValue,
  treeSyntax,
  valueClass,
};
