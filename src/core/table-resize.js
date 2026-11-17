/* global Plainview */
/*
 * Shared pointer-driven column resizing for Markdown and CSV tables.
 */
((root) => {
  const { el } = Plainview;
  const MinColumnWidth = 60;

  function createHandle(column, onResize) {
    const handle = el('span', 'pv-table-resize');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', 'Resize column');
    handle.title = 'Drag to resize column';
    handle.addEventListener('pointerdown', (event) => onResize(event, column));
    return handle;
  }

  function createColGroup(table, count) {
    const colgroup = el('colgroup');
    for (let index = 0; index < count; index += 1) {
      colgroup.append(el('col'));
    }
    table.prepend(colgroup);
    return [...colgroup.children];
  }

  function resizeColumn({ event, column, table, cols, offset, headers }) {
    event.preventDefault();
    event.stopPropagation();
    const wrap = document.documentElement.dataset.pvTableLayout !== 'scroll';
    if (!table.classList.contains('pv-table-resizable')) {
      const headCells = table.tHead.rows[0].cells;
      const widths = [
        ...(offset > 0 ? [headCells[0].getBoundingClientRect().width] : []),
        ...headers.map((header) => header.getBoundingClientRect().width),
      ];
      for (let index = 0; index < widths.length; index += 1) {
        if (widths[index] > 0) {
          cols[index].style.width = `${widths[index]}px`;
        }
      }
      table.classList.add('pv-table-resizable');
    }
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidths = cols.map((col) => col.getBoundingClientRect().width);
    handle.setPointerCapture(event.pointerId);
    function move(moveEvent) {
      const delta = moveEvent.clientX - startX;
      const canGrow = column < cols.length - 1;
      const canShrink = column > offset;
      if (wrap && (canGrow || canShrink)) {
        const neighbor = canGrow ? column + 1 : column - 1;
        const pairWidth = startWidths[column] + startWidths[neighbor];
        const width = Math.max(
          MinColumnWidth,
          Math.min(pairWidth - MinColumnWidth, startWidths[column] + delta),
        );
        cols[column].style.width = `${width}px`;
        cols[neighbor].style.width = `${pairWidth - width}px`;
        return;
      }

      let width = Math.max(MinColumnWidth, startWidths[column] + delta);
      if (wrap) {
        const fixed = startWidths.slice(0, offset).reduce((sum, value) => sum + value, 0);
        width = Math.min(width, table.getBoundingClientRect().width - fixed);
      }
      cols[column].style.width = `${width}px`;
    }
    function end() {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
  }

  function enable(table, { offset = 0 } = {}) {
    if (!table || table.dataset.pvResizable === 'true') {
      return;
    }

    if (document.documentElement.dataset.pvTableResize === 'off') {
      return;
    }
    const headerRow = table.tHead?.rows[0];
    if (!headerRow) {
      return;
    }
    const headers = [...headerRow.cells].slice(offset);
    if (headers.length === 0) {
      return;
    }
    const cols = table.querySelector('colgroup')
      ? [...table.querySelector('colgroup').children]
      : createColGroup(table, headerRow.cells.length);
    table.dataset.pvResizable = 'true';
    for (let index = 0; index < headers.length; index += 1) {
      headers[index].append(
        createHandle(offset + index, (event, column) =>
          resizeColumn({ event, column, table, cols, offset, headers }),
        ),
      );
    }
  }

  function disableAll() {
    for (const table of document.querySelectorAll(
      '.pv-csv-table, .pv-markdown .pv-table-wrap table',
    )) {
      for (const handle of table.querySelectorAll('.pv-table-resize')) {
        handle.remove();
      }
      table.querySelector('colgroup')?.remove();
      table.classList.remove('pv-table-resizable');
      delete table.dataset.pvResizable;
    }
  }

  function enableAll() {
    for (const table of document.querySelectorAll(
      '.pv-csv-table, .pv-markdown .pv-table-wrap table',
    )) {
      enable(table, { offset: table.classList.contains('pv-csv-table') ? 1 : 0 });
    }
  }

  function apply(enabled) {
    document.documentElement.dataset.pvTableResize = enabled ? 'on' : 'off';
    if (!enabled) {
      disableAll();
      return;
    }

    enableAll();
  }

  function applyLayout(layout) {
    document.documentElement.dataset.pvTableLayout = layout === 'scroll' ? 'scroll' : 'wrap';
    if (layout !== 'wrap') {
      return;
    }

    const resizeOn = document.documentElement.dataset.pvTableResize !== 'off';
    disableAll();
    if (resizeOn) {
      enableAll();
    }
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    tableResize: { apply, applyLayout, enable },
  });
})(globalThis);
