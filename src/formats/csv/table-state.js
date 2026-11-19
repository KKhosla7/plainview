const FILTER_DEBOUNCE_MS = 120;

function updateHeaders(headCells, sortState) {
  for (let column = 0; column < headCells.length; column += 1) {
    const th = headCells[column];
    const icon = th.querySelector('.pv-csv-sort-icon');
    if (sortState.column !== column) {
      th.setAttribute('aria-sort', 'none');
      icon.textContent = '↕';
      continue;
    }
    th.setAttribute('aria-sort', sortState.direction > 0 ? 'ascending' : 'descending');
    icon.textContent = sortState.direction > 0 ? '↑' : '↓';
  }
}

function createTableState({
  filter,
  computeVisible,
  virtualTable,
  headerParts,
  sortState,
  count,
  total,
  status,
  columns,
}) {
  let timer = 0;
  let visibleRows = [];

  function render() {
    const visible = computeVisible();
    visibleRows = visible;
    virtualTable.render(visible);
    updateHeaders(headerParts.headCells, sortState);
    count.textContent = `${visible.length.toLocaleString()} of ${total.toLocaleString()} rows`;
    status.textContent = visible.length === 0 ? 'No rows match this filter.' : '';
    status.classList.toggle('is-empty', visible.length === 0);
  }

  function scheduleRender() {
    globalThis.clearTimeout(timer);
    timer = globalThis.setTimeout(render, FILTER_DEBOUNCE_MS);
  }

  return {
    getVisibleRows: () => visibleRows.map((row) => row.cells.slice(0, columns)),
    isFiltered: () => filter.value.trim() !== '' || headerParts.columnFilters.some(Boolean),
    render,
    scheduleRender,
  };
}

export { createTableState };
