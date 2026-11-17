/* global Plainview */
/*
 * Pointer-driven CSV column resizing.
 */
((root) => {
  const { el } = Plainview;

  function createResizeHandle(column, onResize) {
    const handle = el('span', 'pv-csv-resize');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', 'Resize column');
    handle.title = 'Drag to resize column';
    handle.addEventListener('pointerdown', (event) => onResize(event, column));
    return handle;
  }

  function createColumnResizer({ table, cols, headCells }) {
    return function resizeColumn(event, column) {
      event.preventDefault();
      event.stopPropagation();
      if (!table.classList.contains('pv-csv-resizable')) {
        const widths = [
          table.querySelector('.pv-csv-corner').getBoundingClientRect().width,
          ...headCells.map((cell) => cell.getBoundingClientRect().width),
        ];
        for (let index = 0; index < widths.length; index += 1) {
          cols[index].style.width = `${widths[index]}px`;
        }
        table.classList.add('pv-csv-resizable');
      }
      const handle = event.currentTarget;
      const startX = event.clientX;
      const startWidth = cols[column + 1].getBoundingClientRect().width;
      handle.setPointerCapture(event.pointerId);
      function move(moveEvent) {
        const width = Math.max(60, startWidth + moveEvent.clientX - startX);
        cols[column + 1].style.width = `${width}px`;
      }
      function end() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    csvResize: { createColumnResizer, createResizeHandle },
  });
})(globalThis);
