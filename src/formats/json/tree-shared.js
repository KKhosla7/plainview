import { el } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';

/* global Plainview */
/*
 * Small tree-node presentation helpers shared by the JSON tree renderer.
 */
function span(className, text) {
  return el('span', className, text);
}

function actionButton(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

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
const MaxJsonlFormatCache = 250;

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

function renderKey(key, syntax) {
  if (valueKind(key) === 'number') {
    return span('pv-json-index', String(key));
  }

  return span('pv-json-key', syntax === 'yaml' ? String(key) : JSON.stringify(key));
}

function pathTextFor(path) {
  return Plainview.jsonPath.pathToJsonPath(path);
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

function pathButton(pathText) {
  const node = el('button', 'pv-json-path', '⧉');
  node.type = 'button';
  node.title = `Copy path ${pathText}`;
  node.setAttribute('aria-label', `Copy path ${pathText}`);
  node.setAttribute('data-json-path', pathText);
  return node;
}

export const jsonTreeShared = {
  actionButton,
  childEntries,
  entryCount,
  isContainer,
  keyIndex,
  pathTextFor,
  pathButton,
  renderKey,
  renderValue,
  span,
  treeSyntax,
  valueClass,
};
