import assert from 'node:assert/strict';
import { test as it } from 'node:test';
import { csvLimits, parseCsv } from '../src/formats/csv/parse.js';

it('parses basic CSV and strips a BOM', () => {
  const parsed = parseCsv('\uFEFFname,value\nalpha,1\nbeta,2\n');
  assert.deepEqual(parsed.rows, [
    ['name', 'value'],
    ['alpha', '1'],
    ['beta', '2'],
  ]);
  assert.equal(parsed.delimiter, ',');
  assert.equal(parsed.error, null);
});

it('parses CRLF and a final empty field', () => {
  const parsed = parseCsv('a,b,\r\nc,d,e\r\n');
  assert.deepEqual(parsed.rows, [
    ['a', 'b', ''],
    ['c', 'd', 'e'],
  ]);
});

it('handles quoted commas, escaped quotes and embedded newlines', () => {
  const parsed = parseCsv('name,note\nalpha,"one, quoted"\nbeta,"two\nlines"\ngamma,"a ""quote"""');
  assert.deepEqual(parsed.rows, [
    ['name', 'note'],
    ['alpha', 'one, quoted'],
    ['beta', 'two\nlines'],
    ['gamma', 'a "quote"'],
  ]);
});

it('detects comma, tab, semicolon and pipe delimiters', () => {
  assert.equal(parseCsv('a,b\n1,2').delimiter, ',');
  assert.equal(parseCsv('a\tb\n1\t2').delimiter, '\t');
  assert.equal(parseCsv('a;b\n1;2').delimiter, ';');
  assert.equal(parseCsv('a|b\n1|2').delimiter, '|');
});

it('does not let a quoted comma confuse delimiter detection', () => {
  const parsed = parseCsv('"a,b";c\n1;2');
  assert.equal(parsed.delimiter, ';');
  assert.deepEqual(parsed.rows[0], ['a,b', 'c']);
});

it('uses an explicit preferred delimiter', () => {
  const parsed = parseCsv('a;b\n1;2', { delimiter: '\t' });
  assert.equal(parsed.delimiter, '\t');
  assert.deepEqual(parsed.rows[0], ['a;b']);
});

it('keeps ragged rows intact so the view can pad them', () => {
  const parsed = parseCsv('a,b,c\n1\n2,3\n');
  assert.deepEqual(parsed.rows, [['a', 'b', 'c'], ['1'], ['2', '3']]);
});

it('returns no rows for an empty document', () => {
  assert.deepEqual(parseCsv('').rows, []);
  assert.deepEqual(parseCsv('\n').rows, [['']]);
});

it('reports an unterminated quoted field', () => {
  const parsed = parseCsv('a,"never closed');
  assert.equal(parsed.error.message, 'Unterminated quoted field');
  assert.equal(parsed.error.line, 1);
});

it('caps rows and columns', () => {
  const manyRows = Array.from({ length: csvLimits.MaxRows + 10 }, (_, index) => `r${index}`).join(
    '\n',
  );
  const cappedRows = parseCsv(manyRows);
  assert.equal(cappedRows.rows.length, csvLimits.MaxRows);
  assert.equal(cappedRows.rowsTruncated, true);

  const manyColumns = Array.from(
    { length: csvLimits.MaxColumns + 10 },
    (_, index) => `c${index}`,
  ).join(',');
  const cappedColumns = parseCsv(manyColumns);
  assert.equal(cappedColumns.rows[0].length, csvLimits.MaxColumns);
  assert.equal(cappedColumns.columnsTruncated, true);
});
