import { el } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';

function span(className, text) {
  return el('span', className, text);
}

function actionButton(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

function renderKey(key, syntax) {
  if (valueKind(key) === 'number') {
    return span('pv-json-index', String(key));
  }

  return span('pv-json-key', syntax === 'yaml' ? String(key) : JSON.stringify(key));
}

function pathButton(pathText) {
  const node = el('button', 'pv-json-path', '⧉');
  node.type = 'button';
  node.title = `Copy path ${pathText}`;
  node.setAttribute('aria-label', `Copy path ${pathText}`);
  node.setAttribute('data-json-path', pathText);
  return node;
}

export { actionButton, pathButton, renderKey, span };
