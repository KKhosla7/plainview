import { copyText } from '../../core/clipboard.js';
import { createElement } from '../../core/dom.js';
import { onAsync } from '../../core/events.js';
import { JSON_TREE_MODE_KEY, saveSetting } from '../.././core/settings.js';

const COPY_RESET_MS = 1200;
const CANVAS_MIN = 100;
const CANVAS_MAX = 200;
const CANVAS_DEFAULT = 130;
const CANVAS_SCALE = 100;

function el(tag, className, text) {
  const node = createElement(tag);
  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function metaButton(label) {
  const button = el('button', 'pv-meta-button', label);
  button.type = 'button';
  return button;
}

const CanvasWidthKey = 'plainview-canvas-width';

function createCanvasWidth(article) {
  const stored = Number(localStorage.getItem(CanvasWidthKey));
  const percent =
    Number.isFinite(stored) && stored > 0
      ? Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, stored))
      : CANVAS_DEFAULT;
  const wrap = el('label', 'pv-canvas-width');
  wrap.append(el('span', '', 'Canvas'));
  const input = el('input', 'pv-canvas-width-input');
  input.type = 'range';
  input.min = '100';
  input.max = '200';
  input.step = '10';
  input.value = String(percent);
  const apply = () => {
    document.documentElement.style.setProperty(
      '--pv-canvas-scale',
      String(Number(input.value) / CANVAS_SCALE),
    );
    localStorage.setItem(CanvasWidthKey, input.value);
  };
  input.addEventListener('input', apply);
  wrap.append(input);
  apply();
  article.append(wrap);
}

function createDataToolbar({ article, source, summary, copyLabel, treeMode, canvasWidth }) {
  const meta = el('div', 'pv-doc-meta');
  const text = el('span', 'pv-meta-text', summary);
  const actions = el('span', 'pv-meta-actions');

  const expand = metaButton('Expand all');
  const collapse = metaButton('Collapse all');
  bindTreeActions(article, expand, collapse);
  const copy = metaButton(copyLabel);
  onAsync(copy, 'click', async () => {
    const ok = await copyText(source);
    copy.textContent = ok ? 'Copied' : 'Copy failed';
    globalThis.setTimeout(() => {
      copy.textContent = copyLabel;
    }, COPY_RESET_MS);
  });

  actions.append(expand, collapse);

  if (treeMode) {
    const mode = metaButton(treeMode === 'virtual' ? 'Classic tree' : 'Virtual tree');
    mode.title = treeMode === 'virtual' ? 'Use the paged tree' : 'Use the virtualized tree';
    mode.addEventListener('click', () => {
      saveSetting(JSON_TREE_MODE_KEY, treeMode === 'virtual' ? 'classic' : 'virtual');
      location.reload();
    });
    actions.append(mode);
  }
  actions.append(copy);
  meta.append(text, actions);

  if (canvasWidth) {
    createCanvasWidth(article);
  }

  return meta;
}

function bindTreeActions(article, expand, collapse) {
  expand.addEventListener('click', () => {
    const virtualTree = article.querySelector('.pv-virtual-tree');
    if (virtualTree) {
      virtualTree.dispatchEvent(new CustomEvent('pv-expand-all'));
      return;
    }

    for (const details of article.querySelectorAll('details')) {
      details.open = true;
    }
  });

  collapse.addEventListener('click', () => {
    const virtualTree = article.querySelector('.pv-virtual-tree');
    if (virtualTree) {
      virtualTree.dispatchEvent(new CustomEvent('pv-collapse-all'));
      return;
    }

    for (const details of article.querySelectorAll('details')) {
      details.open = false;
    }
  });
}

export { createDataToolbar };
