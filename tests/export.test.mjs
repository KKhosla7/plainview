import assert from 'node:assert/strict';
import { test as it } from 'node:test';
import '../src/core/export-name.js';

const { exportFileName } = globalThis.Plainview;

it('replaces the source extension with .html', () => {
  assert.equal(exportFileName('sample.md'), 'sample.html');
  assert.equal(exportFileName('tool-output.json'), 'tool-output.html');
  assert.equal(exportFileName('archive.tar.gz'), 'archive.tar.html');
});

it('handles names without an extension', () => {
  assert.equal(exportFileName('README'), 'README.html');
  assert.equal(exportFileName(''), 'document.html');
  assert.equal(exportFileName(undefined), 'document.html');
});

it('handles dotfiles and trailing dots deterministically', () => {
  assert.equal(exportFileName('.env'), '.env.html');
  assert.equal(exportFileName('file.'), 'file.html');
});
