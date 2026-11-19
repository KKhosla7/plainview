import { copyText } from '../../core/clipboard.js';
import { el } from '../../core/dom.js';
import { onAsync } from '../../core/events.js';
import { valueKind } from '../../core/value.js';
import { openAncestors } from '../shared/tree-tools.js';

const STICKY_OFFSET_GAP = 16;
const RESULT_PREVIEW_CHARS = 50;
const TITLE_PREVIEW_CHARS = 160;
const COPY_RESET_MS = 1200;
const SEARCH_DEBOUNCE_MS = 120;

function button(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

function inputClear(input, label, onClear) {
  const node = el('button', 'pv-input-clear', '×');
  node.type = 'button';
  node.title = label;
  node.setAttribute('aria-label', label);
  const update = () => {
    node.hidden = !input.value;
  };
  input.addEventListener('input', update);
  node.addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
    onClear();
  });
  update();
  return node;
}

function primitiveText(value) {
  if (value === null) {
    return 'null';
  }

  if (valueKind(value) === 'string') {
    return value;
  }

  if (valueKind(value) === 'number' || valueKind(value) === 'boolean') {
    return String(value);
  }

  return '';
}

function previewValue(value) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (valueKind(value) === 'object') {
    return `{${Object.keys(value).length} keys}`;
  }

  return String(value).slice(0, TITLE_PREVIEW_CHARS);
}

function valueAtPath(rootValue, path) {
  let value = rootValue;
  for (const segment of path) {
    if (value === null || valueKind(value) !== 'object') {
      return;
    }
    value = value[segment];
  }

  return value;
}

function recordPathFor(rootValue, path) {
  const value = valueAtPath(rootValue, path);
  const parentPath = path.slice(0, -1);
  const parent = valueAtPath(rootValue, parentPath);
  const isRecord = value !== null && valueKind(value) === 'object';
  const parentIsRecord =
    parent !== null && valueKind(parent) === 'object' && !Array.isArray(parent);
  return !isRecord && parentIsRecord ? parentPath : path;
}

function mark(entry, className) {
  entry.node.classList.add(className);
  if (entry.summary) {
    entry.summary.classList.add(className);
  }
}

function unmark(entry, className) {
  entry.node.classList.remove(className);
  if (entry.summary) {
    entry.summary.classList.remove(className);
  }
}

function stickyOffset() {
  const topbar = document.querySelector('.pv-topbar');
  const tools = document.querySelector('.pv-json-tools');
  return (topbar?.offsetHeight || 0) + (tools?.offsetHeight || 0) + STICKY_OFFSET_GAP;
}

function scrollResultIntoView(node) {
  const offset = stickyOffset();
  const rect = node.getBoundingClientRect();
  if (rect.top >= offset && rect.bottom <= globalThis.innerHeight) {
    return;
  }

  const top = globalThis.scrollY + rect.top + rect.height / 2 - globalThis.innerHeight / 2;
  globalThis.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function reveal(entry) {
  openAncestors(entry);
  requestAnimationFrame(() => {
    scrollResultIntoView(entry.node);
  });
}

function selectHit(hits, nextIndex, activeClass) {
  for (const hit of hits) {
    unmark(hit.entry, activeClass);
  }

  if (hits.length === 0) {
    return -1;
  }
  const wrapped = (nextIndex + hits.length) % hits.length;
  const active = hits[wrapped];
  mark(active.entry, activeClass);
  reveal(active.entry);
  return wrapped;
}

function clearStatus(status, pathInput) {
  status.textContent = '';
  status.className = 'pv-json-status';
  pathInput?.removeAttribute('aria-invalid');
}

async function openResult({ hitClass, indexRef, item, list, onReveal }) {
  if (onReveal && item.path) {
    const revealed = await onReveal(item.path);
    if (revealed?.handled) {
      list.hidden = true;
      return true;
    }

    if (revealed) {
      if (hitClass) {
        mark(revealed, hitClass);
      }
      reveal(revealed);
      list.hidden = true;
      return true;
    }
  }

  if (!item.rendered) {
    return false;
  }
  const entry = indexRef.current.get(item.pathText);
  if (!entry) {
    return false;
  }
  reveal(entry);
  list.hidden = true;
  return true;
}

function resultRow({ hitClass, item, list, indexRef, onReveal }) {
  const row = el('button', 'pv-json-search-result');
  row.type = 'button';
  row.title = item.rendered ? `Go to ${item.pathText}` : `Copy path ${item.pathText}`;
  const path = el('span', 'pv-json-search-path', item.pathText);
  const value = el('span', 'pv-json-search-value', previewValue(item.value));
  row.append(path, value);
  onAsync(row, 'click', async () => {
    if (await openResult({ hitClass, indexRef, item, list, onReveal })) {
      return;
    }
    const ok = await copyText(item.pathText);
    const previous = value.textContent;
    value.textContent = ok ? 'Copied path' : 'Copy failed';
    globalThis.setTimeout(() => {
      value.textContent = previous;
    }, COPY_RESET_MS);
  });
  return row;
}

function bindResultDismiss({ anchor, list, reopen }) {
  function close() {
    list.hidden = true;
  }

  function show() {
    if (list.childElementCount > 0) {
      list.hidden = false;
    }
  }

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || list.hidden) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      close();
    },
    true,
  );
  document.addEventListener('click', (event) => {
    if (!(list.hidden || anchor.contains(event.target))) {
      close();
    }
  });
  reopen?.addEventListener('focus', show);
  reopen?.addEventListener('click', show);
}

function renderResults({ hitClass, list, matches, indexRef, onReveal }) {
  if (matches.length === 0) {
    list.hidden = true;
    list.replaceChildren();
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of matches.slice(0, RESULT_PREVIEW_CHARS)) {
    fragment.append(resultRow({ hitClass, item, list, indexRef, onReveal }));
  }

  if (matches.length > 50) {
    fragment.append(el('div', 'pv-json-search-more', `+${matches.length - 50} more results`));
  }
  list.replaceChildren(fragment);
  list.hidden = false;
}

export const jsonToolsShared = {
  COPY_RESET_MS,
  SEARCH_DEBOUNCE_MS,
  bindResultDismiss,
  button,
  clearStatus,
  el,
  inputClear,
  mark,
  previewValue,
  primitiveText,
  recordPathFor,
  valueAtPath,
  stickyOffset,
  renderResults,
  scrollResultIntoView,
  selectHit,
  unmark,
};
