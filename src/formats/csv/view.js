import { el } from '../.././core/dom.js';

/* global Plainview */
/*
 * CSV/TSV document entry point. Table controls live in table.js.
 */
((root) => {
  function columnIsEmpty(rows, index) {
    for (const row of rows) {
      if (String(row[index] ?? '').trim() !== '') {
        return false;
      }
    }

    return true;
  }

  function trimTrailingColumns(rows) {
    let columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    while (columns > 0 && columnIsEmpty(rows, columns - 1)) {
      columns -= 1;
    }

    return columns;
  }

  function createCsvTools() {
    const tools = el('div', 'pv-json-tools pv-csv-tools');
    const searchWrap = el('div', 'pv-json-search');
    const filter = el('input', 'pv-json-input');
    filter.type = 'search';
    filter.placeholder = 'Search all columns…';
    filter.setAttribute('aria-label', 'Search CSV rows in any column');
    filter.spellcheck = false;
    const count = el('span', 'pv-json-count', '');
    const status = el('div', 'pv-json-status');
    status.setAttribute('role', 'status');
    const clear = Plainview.jsonToolsShared.inputClear(filter, 'Clear CSV search', () => {
      filter.value = '';
      filter.dispatchEvent(new Event('input', { bubbles: true }));
      filter.focus();
    });
    searchWrap.append(filter, clear, count);
    tools.append(searchWrap, status);
    return { tools, filter, count, status };
  }

  function appendCsvCapNote(article, parsed) {
    if (!(parsed.rowsTruncated || parsed.columnsTruncated)) {
      return;
    }
    const notes = [];
    if (parsed.rowsTruncated) {
      notes.push(`only the first ${parsed.maxRows.toLocaleString()} rows are shown`);
    }

    if (parsed.columnsTruncated) {
      notes.push(`only the first ${parsed.maxColumns.toLocaleString()} columns are shown`);
    }
    article.append(el('div', 'pv-tree-note', `Table capped: ${notes.join('; ')}.`));
  }

  function createCsvExportData({ delimiter, filter, formatId, headerCells, label, source, table }) {
    return {
      formatId,
      hasFilter: () => table.isFiltered(),
      getDocument() {
        return {
          delimiter,
          filter: table.isFiltered() ? { kind: 'csv', text: filter.value } : null,
          formatId,
          label,
          source,
        };
      },
      getData(scope) {
        if (scope !== 'filtered') {
          return { data: source, formatId, kind: 'text' };
        }

        if (!table.isFiltered()) {
          return null;
        }

        return {
          delimiter,
          formatId,
          header: headerCells,
          kind: 'csv',
          rows: table.getVisibleRows(),
        };
      },
    };
  }

  function buildCsv(source, format = {}) {
    const { label: formatLabel } = format;
    const parsed = Plainview.parseCsv(source, { delimiter: format.delimiter });
    const article = el('article', 'pv-doc pv-data-doc pv-csv-doc');
    const { rows } = parsed;
    const columns = trimTrailingColumns(rows);
    const label = formatLabel || 'CSV';

    if (parsed.error) {
      article.append(
        el('div', 'pv-doc-title', `Invalid ${label}`),
        Plainview.errorPanel(parsed.error.message, parsed.error.line),
      );
    }
    article.append(
      Plainview.createDataToolbar({
        article,
        source,
        summary:
          `${Math.max(0, rows.length - 1).toLocaleString()} data rows · ` +
          `${columns.toLocaleString()} columns · ${Plainview.formatBytes(String(source).length)}`,
        copyLabel: `Copy ${label}`,
      }),
    );

    if (rows.length === 0 || columns === 0) {
      article.append(el('p', 'pv-empty', `This ${label} file is empty.`));
      return { article, stats: { rows: 0, columns: 0 }, error: Boolean(parsed.error) };
    }

    const header = rows[0] || [];
    const dataRows = rows.slice(1).map((cells, index) => ({ cells, number: index + 1 }));
    const { tools, filter, count, status } = createCsvTools();
    const table = Plainview.csvTable.createTable({
      header,
      columns,
      dataRows,
      filter,
      count,
      status,
    });
    article.append(tools, table.element);
    appendCsvCapNote(article, parsed);
    const { delimiter } = parsed;
    const formatId = delimiter === '\t' ? 'tsv' : 'csv';
    const headerCells = header.slice(0, columns);
    return {
      article,
      stats: { rows: rows.length, columns },
      error: Boolean(parsed.error),
      exportData: createCsvExportData({
        delimiter,
        filter,
        formatId,
        headerCells,
        label,
        source,
        table,
      }),
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildCsv });
})(globalThis);
