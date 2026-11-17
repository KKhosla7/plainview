/* global Plainview */
/*
 * CSV table header, filtering, sorting and row rendering.
 */
((root) => {
  const { el } = Plainview;

  function numeric(value) {
    return /^-?\d+(?:\.\d+)?$/u.test(String(value ?? '').trim());
  }

  function filterIcon() {
    const SvgNamespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SvgNamespace, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '11');
    svg.setAttribute('height', '11');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SvgNamespace, 'path');
    path.setAttribute('d', 'M2 3h12l-4.5 5v3.5l-3 2V8L2 3z');
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
    return svg;
  }

  function compareCells(left, right) {
    const a = String(left ?? '');
    const b = String(right ?? '');
    if (numeric(a) && numeric(b)) {
      return Number(a) - Number(b);
    }

    if (!a && b) {
      return 1;
    }

    if (a && !b) {
      return -1;
    }

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  function createSortControl(title, column, onSort) {
    const sort = el('button', 'pv-csv-sort');
    sort.type = 'button';
    const icon = el('span', 'pv-csv-sort-icon', '↕');
    icon.setAttribute('aria-hidden', 'true');
    sort.title = `Sort by ${title}`;
    sort.addEventListener('click', () => onSort(column));
    return { sort, icon };
  }

  function createFilterInput(title, column, columnFilters, onFilter) {
    const filterCell = el('th', 'pv-csv-filter-cell');
    filterCell.hidden = true;
    const filterInput = el('input', 'pv-csv-column-filter');
    filterInput.type = 'search';
    filterInput.placeholder = 'Filter';
    filterInput.setAttribute('aria-label', `Filter by ${title}`);
    filterInput.spellcheck = false;
    filterInput.addEventListener('input', () => {
      columnFilters[column] = filterInput.value.trim().toLocaleLowerCase();
      onFilter();
    });
    filterCell.append(filterInput);
    return { filterCell, filterInput };
  }

  function createFilterToggle({
    title,
    column,
    filterCell,
    filterInput,
    filterRow,
    filterCells,
    columnFilters,
    onFilter,
  }) {
    const filterToggle = el('button', 'pv-csv-filter-toggle');
    filterToggle.type = 'button';
    filterToggle.setAttribute('aria-label', `Filter by ${title}`);
    filterToggle.setAttribute('aria-expanded', 'false');
    filterToggle.title = `Filter by ${title}`;
    filterToggle.append(filterIcon());
    filterToggle.addEventListener('click', () => {
      const show = filterCell.hidden;
      filterCell.hidden = !show;
      filterRow.hidden = !filterCells.some((cell) => !cell.hidden);
      filterToggle.setAttribute('aria-expanded', String(show));
      filterToggle.classList.toggle('is-active', show);
      if (show) {
        filterInput.focus();
        return;
      }
      filterInput.value = '';
      columnFilters[column] = '';
      onFilter();
    });
    return filterToggle;
  }

  function createHeaderCell({
    header,
    column,
    filterRow,
    filterCells,
    columnFilters,
    onSort,
    onFilter,
  }) {
    const title = header[column] || `column ${column + 1}`;
    const th = el('th', 'pv-csv-header');
    th.setAttribute('aria-sort', 'none');
    const headTools = el('div', 'pv-csv-head-tools');
    const { sort, icon } = createSortControl(title, column, onSort);
    sort.append(document.createTextNode(header[column] ?? ''), icon);
    const { filterCell, filterInput } = createFilterInput(title, column, columnFilters, onFilter);
    filterCells.push(filterCell);
    filterRow.append(filterCell);
    const filterToggle = createFilterToggle({
      title,
      column,
      filterCell,
      filterInput,
      filterRow,
      filterCells,
      columnFilters,
      onFilter,
    });
    headTools.append(sort, filterToggle);
    th.append(headTools);
    columnFilters.push('');
    return th;
  }

  function createHeader({ header, columns, filterRow, onSort, onFilter }) {
    const thead = el('thead');
    const headRow = el('tr');
    headRow.append(el('th', 'pv-csv-corner', '#'));
    filterRow.hidden = true;
    filterRow.append(el('th', 'pv-csv-corner', ''));
    const headCells = [];
    const filterCells = [];
    const columnFilters = [];

    for (let column = 0; column < columns; column += 1) {
      const th = createHeaderCell({
        header,
        column,
        filterRow,
        filterCells,
        columnFilters,
        onSort,
        onFilter,
      });
      headCells.push(th);
      headRow.append(th);
    }

    thead.append(headRow, filterRow);
    return { thead, headCells, columnFilters };
  }

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

  function filterRows(rows, needle) {
    if (!needle) {
      return rows;
    }

    return rows.filter((row) =>
      row.cells.some((cell) =>
        String(cell ?? '')
          .toLocaleLowerCase()
          .includes(needle),
      ),
    );
  }

  function sortRows(rows, sortState) {
    if (sortState.column < 0) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      const compared = compareCells(left.cells[sortState.column], right.cells[sortState.column]);
      return compared * sortState.direction || left.number - right.number;
    });
  }

  function renderRows(tbody, rows, columns) {
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const tr = el('tr');
      tr.append(el('th', 'pv-csv-row-number', String(row.number)));
      for (let column = 0; column < columns; column += 1) {
        const value = row.cells[column] ?? '';
        const cell = el('td', 'pv-csv-cell', value);
        if (numeric(value)) {
          cell.classList.add('pv-csv-number');
        }
        tr.append(cell);
      }
      fragment.append(tr);
    }
    tbody.replaceChildren(fragment);
  }

  function createTable({ header, columns, dataRows, filter, count, status }) {
    const sortState = { column: -1, direction: 1 };
    const filterRow = el('tr', 'pv-csv-filter-row');
    const headerParts = createHeader({
      header,
      columns,
      filterRow,
      onSort(column) {
        if (sortState.column === column) {
          sortState.direction *= -1;
        } else {
          sortState.column = column;
          sortState.direction = 1;
        }
        render();
      },
      onFilter: () => scheduleRender(),
    });

    const wrap = el('div', 'pv-csv-wrap');
    const table = el('table', 'pv-csv-table');
    const tbody = el('tbody');
    table.append(headerParts.thead, tbody);
    wrap.append(table);
    Plainview.tableResize.enable(table, { offset: 1, tableId: 'csv' });

    let timer = 0;

    function render() {
      const needle = filter.value.trim().toLocaleLowerCase();
      const visible = sortRows(filterRows(dataRows, needle), sortState);
      renderRows(tbody, visible, columns);
      updateHeaders(headerParts.headCells, sortState);
      count.textContent = `${visible.length.toLocaleString()} of ${dataRows.length.toLocaleString()} rows`;
      status.textContent = visible.length === 0 ? 'No rows match this filter.' : '';
      status.classList.toggle('is-empty', visible.length === 0);
    }

    function scheduleRender() {
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(render, Plainview.csvTable.FilterDebounceMs);
    }

    filter.addEventListener('input', scheduleRender);
    render();
    return { element: wrap, render, scheduleRender };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    csvTable: {
      FilterDebounceMs: 120,
      compareCells,
      createTable,
    },
    compareCsvCells: compareCells,
  });
})(globalThis);
