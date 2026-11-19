import { copyText } from '../core/clipboard.js';
import { el, replaceWithGeneratedHtml } from '../core/dom.js';
import { onAsync } from '../core/events.js';
import { formatBytes } from '.././formats/json/parse.js';
import { highlight } from '../formats/source/core.js';

const COPY_RESET_MS = 1200;
const PREVIEW_CHARS = 200_000;
const HIGHLIGHT_CHARS = 500_000;
const PREVIEW_CUT_RATIO = 0.8;

function previewSource(source, full) {
  if (full || source.length <= PREVIEW_CHARS) {
    return { preview: false, text: source };
  }
  let text = source.slice(0, PREVIEW_CHARS);
  const lastNewline = text.lastIndexOf('\n');
  if (lastNewline > PREVIEW_CHARS * PREVIEW_CUT_RATIO) {
    text = text.slice(0, lastNewline);
  }

  return { preview: true, text };
}

function applySourceText(code, text, format) {
  if (text.length > HIGHLIGHT_CHARS) {
    code.textContent = text;
    return;
  }
  replaceWithGeneratedHtml(code, highlight(text, format.id));
}

function updateSourceStatus({ status, fullButton, preview, total, text, full }) {
  if (preview) {
    status.textContent = `Preview · first ${formatBytes(text.length)} of ${formatBytes(total)}`;
    fullButton.hidden = false;
  } else if (text.length > HIGHLIGHT_CHARS) {
    status.textContent = `Full source · ${formatBytes(total)} · highlighting off`;
  } else if (total > PREVIEW_CHARS) {
    status.textContent = `Full source · ${formatBytes(total)}`;
  } else {
    status.textContent = '';
  }
  fullButton.disabled = full;
  if (full) {
    fullButton.hidden = true;
  }
}

function createSourcePane(source, format) {
  const pane = el('div', 'pv-raw-pane');
  const head = el('div', 'pv-raw-head');
  const label = el('div', 'pv-raw-label', 'Original source');
  const status = el('div', 'pv-raw-status', '');
  const actions = el('span', 'pv-raw-actions');
  const copy = el('button', 'pv-meta-button pv-raw-copy', 'Copy source');
  copy.type = 'button';
  copy.title = 'Copy the original file text';
  onAsync(copy, 'click', async () => {
    const ok = await copyText(source);
    copy.textContent = ok ? 'Copied' : 'Copy failed';
    globalThis.setTimeout(() => {
      copy.textContent = 'Copy source';
    }, COPY_RESET_MS);
  });

  const fullButton = el('button', 'pv-meta-button pv-raw-full', 'Load full source');
  fullButton.type = 'button';
  fullButton.hidden = true;
  fullButton.title = 'Render the entire file. Large files may take a moment.';

  const pre = el('pre', 'pv-raw-source');
  const code = el('code', 'pv-raw-code');
  pre.append(code);

  let populated = false;
  let full = false;

  function render() {
    const total = source.length;
    const { preview, text } = previewSource(source, full);
    applySourceText(code, text, format);
    updateSourceStatus({ status, fullButton, preview, total, text, full });
  }

  function populate(useFull = false) {
    if (populated && !useFull) {
      return;
    }

    if (populated && full) {
      return;
    }
    populated = true;
    full = full || useFull;
    render();
  }

  fullButton.addEventListener('click', () => {
    fullButton.disabled = true;
    fullButton.textContent = 'Loading full source…';
    globalThis.setTimeout(() => populate(true), 0);
  });

  actions.append(copy, fullButton);
  head.append(label, status, actions);
  pane.append(head, pre);
  return { element: pane, populate };
}

export { createSourcePane };
