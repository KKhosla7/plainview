import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test as it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateXmlXPath, parseXmlSource } from '../src/formats/xml/xml-engine.js';

const EXPECTED_BOOKS = 2;
const source = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'sample.xml'),
  'utf8',
);

it('parses XML into a descriptor document', () => {
  const result = parseXmlSource(source);
  assert.equal(result.ok, true);
  assert.equal(result.document.documentElement.name, 'catalog');
  assert.equal(result.document.stats.attributes, 5);
});

it('evaluates worker XPath node and scalar results', () => {
  assert.equal(evaluateXmlXPath(source, '//book/title').ids.length, EXPECTED_BOOKS);
  assert.equal(evaluateXmlXPath(source, 'count(//book)').value, EXPECTED_BOOKS);
});
