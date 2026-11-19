import { el } from '../../core/dom.js';

const VIRTUALIZE_THRESHOLD_VALUE = 200;
const VirtualizeThreshold = VIRTUALIZE_THRESHOLD_VALUE;
const ESTIMATE_ROW_HEIGHT_VALUE = 28;
const EstimateRowHeight = ESTIMATE_ROW_HEIGHT_VALUE;
const OVERSCAN_ROWS_VALUE = 6;
const OverscanRows = OVERSCAN_ROWS_VALUE;

function createSpacer(height, columns) {
  const tr = el('tr', 'pv-csv-spacer');
  const cell = el('td');
  cell.colSpan = columns + 1;
  cell.style.height = `${Math.max(0, height)}px`;
  tr.append(cell);
  return tr;
}

function rowHeight(heights, row) {
  return heights.get(row.number) ?? EstimateRowHeight;
}

function rebuildOffsets(rows, heights) {
  const offsets = [0];
  for (let index = 0; index < rows.length; index += 1) {
    offsets.push(offsets[index] + rowHeight(heights, rows[index]));
  }

  return offsets;
}

function visibleRange(rows, offsets, wrap) {
  const top = wrap.scrollTop;
  const viewport = wrap.clientHeight || globalThis.innerHeight;
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid + 1] <= top) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const start = Math.max(0, low - OverscanRows);
  let end = start;
  while (end < rows.length && offsets[end] < top + viewport) {
    end += 1;
  }

  return { end: Math.min(rows.length, end + OverscanRows), start };
}

function renderAllRows(tbody, rows, createRow) {
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    fragment.append(createRow(row));
  }
  tbody.replaceChildren(fragment);
}

function renderWindow({ tbody, wrap, rows, offsets, columns, createRow }) {
  const { start, end } = visibleRange(rows, offsets, wrap);
  const fragment = document.createDocumentFragment();
  fragment.append(createSpacer(offsets[start], columns));
  for (let index = start; index < end; index += 1) {
    fragment.append(createRow(rows[index]));
  }
  fragment.append(createSpacer(offsets.at(-1) - offsets[end], columns));
  tbody.replaceChildren(fragment);
  return { end, start };
}

function measureRendered({ tbody, rows, start, end, heights }) {
  const rendered = [...tbody.querySelectorAll('tr:not(.pv-csv-spacer)')];
  let changed = false;
  for (let index = start; index < end; index += 1) {
    const node = rendered[index - start];
    if (!node) {
      continue;
    }
    const height = Math.ceil(node.getBoundingClientRect().height);
    const row = rows[index];
    if ((heights.get(row.number) ?? EstimateRowHeight) !== height) {
      heights.set(row.number, height);
      changed = true;
    }
  }

  return changed;
}

function createVirtualTable({ tbody, wrap, columns, createRow }) {
  let currentRows = [];
  let frame = 0;
  const heights = new Map();
  let offsets = rebuildOffsets([], heights);

  function measure(start, end) {
    if (measureRendered({ tbody, rows: currentRows, start, end, heights })) {
      offsets = rebuildOffsets(currentRows, heights);
      paint();
    }
  }

  function paint() {
    if (currentRows.length <= VirtualizeThreshold) {
      renderAllRows(tbody, currentRows, createRow);
      return;
    }
    const { start, end } = renderWindow({
      tbody,
      wrap,
      rows: currentRows,
      offsets,
      columns,
      createRow,
    });
    globalThis.requestAnimationFrame(() => measure(start, end));
  }

  function render(rows) {
    currentRows = rows;
    heights.clear();
    offsets = rebuildOffsets(currentRows, heights);
    paint();
  }

  wrap.addEventListener(
    'scroll',
    () => {
      globalThis.cancelAnimationFrame(frame);
      frame = globalThis.requestAnimationFrame(paint);
    },
    { passive: true },
  );

  return { render };
}

export { createVirtualTable };
