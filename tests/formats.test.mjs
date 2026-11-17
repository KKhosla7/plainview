import assert from 'node:assert/strict';
import { test as it } from 'node:test';
import '../src/core/formats.js';

const { detectFormat } = globalThis.Plainview;

function formatId(type, pathname) {
  return detectFormat(type, pathname)?.id ?? null;
}

it('detects formats by MIME type', () => {
  assert.equal(formatId('text/markdown', '/file.txt'), 'markdown');
  assert.equal(formatId('application/json; charset=utf-8', '/file.txt'), 'json');
  assert.equal(formatId('application/xml', '/file.txt'), 'xml');
  assert.equal(formatId('application/x-yaml', '/file.txt'), 'yaml');
  assert.equal(formatId('application/toml', '/file.txt'), 'toml');
  assert.equal(formatId('text/csv', '/file.txt'), 'csv');
  assert.equal(formatId('text/tab-separated-values', '/file.txt'), 'csv');
});

it('detects formats by extension when the MIME type is generic', () => {
  assert.equal(formatId('text/plain', '/file.md'), 'markdown');
  assert.equal(formatId('', '/file.YML'), 'yaml');
  assert.equal(formatId('text/plain', '/file.toml'), 'toml');
  assert.equal(formatId('application/octet-stream', '/file.csv'), 'csv');
  assert.equal(formatId('text/plain', '/file.tsv'), 'csv');
  assert.equal(formatId('text/plain', '/file.geojson'), 'json');
});

it('keeps CSV and TSV as separate format entries', () => {
  const csv = detectFormat('text/csv', '/file.csv');
  const tsv = detectFormat('text/tab-separated-values', '/file.tsv');
  assert.equal(csv.label, 'CSV');
  assert.equal(csv.delimiter, undefined);
  assert.equal(tsv.label, 'TSV');
  assert.equal(tsv.delimiter, '\t');
});

it('does not claim unsupported plain text or unknown binaries', () => {
  assert.equal(formatId('text/plain', '/file.txt'), null);
  assert.equal(formatId('application/pdf', '/file.json'), null);
  assert.equal(formatId('application/octet-stream', '/file.bin'), null);
  assert.equal(formatId('text/plain', '/file'), null);
});

it('skips HTML, images and SVG even when the extension matches', () => {
  assert.equal(formatId('text/html', '/file.md'), null);
  assert.equal(formatId('application/xhtml+xml', '/file.json'), null);
  assert.equal(formatId('image/png', '/file.json'), null);
  assert.equal(formatId('text/plain', '/file.svg'), null);
  assert.equal(formatId('image/svg+xml', '/file.svg'), null);
});

it('prefers an explicit MIME type over the extension', () => {
  assert.equal(formatId('application/json', '/file.md'), 'json');
  assert.equal(formatId('text/markdown', '/file.json'), 'markdown');
});
