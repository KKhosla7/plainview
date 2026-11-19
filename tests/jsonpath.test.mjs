import assert from 'node:assert/strict';
import { test as it } from 'node:test';
import { jsonPath } from '../src/formats/json/jsonpath-eval.js';

const VALUE_2001 = 2001;
const VALUE_20 = 20;
const VALUE_30 = 30;
const VALUE_10 = 10;
const VALUE_4 = 4;
const VALUE_3 = 3;

const { evaluate, pathToJsonPath } = jsonPath;

function values(nodes) {
  return nodes.map((node) => node.value);
}

const data = {
  name: 'root',
  a: { b: 1 },
  'weird key': [VALUE_10, VALUE_20, VALUE_30],
  items: [
    { id: 1, label: 'one', enabled: true },
    { id: 2, label: 'two', enabled: false },
    { id: VALUE_3, label: 'three', enabled: true },
  ],
  nested: { items: [{ id: VALUE_4, label: 'four', enabled: true }] },
  map: {
    first: { enabled: true },
    second: { enabled: false },
  },
};

it('formats JSONPath expressions for simple and quoted keys', () => {
  assert.equal(pathToJsonPath([]), '$');
  assert.equal(pathToJsonPath(['a', 'b']), '$.a.b');
  assert.equal(pathToJsonPath(['weird key', 0]), '$["weird key"][0]');
  assert.equal(pathToJsonPath(['0']), '$["0"]');
  assert.equal(pathToJsonPath(['x-y']), '$["x-y"]');
});

it('evaluates children, brackets, indexes and negative indexes', () => {
  assert.deepEqual(values(evaluate(data, '$.a.b')), [1]);
  assert.deepEqual(values(evaluate(data, '$["weird key"][1]')), [VALUE_20]);
  assert.deepEqual(values(evaluate(data, '$["weird key"][-1]')), [VALUE_30]);
  assert.deepEqual(values(evaluate(data, '$.items[0].label')), ['one']);
});

it('evaluates wildcards and recursive descent', () => {
  assert.deepEqual(values(evaluate(data, '$.map[*].enabled')), [true, false]);
  assert.deepEqual(values(evaluate(data, '$..label')), ['one', 'two', 'three', 'four']);
  assert.ok(evaluate(data, '$..*').length > VALUE_10);
  assert.deepEqual(values(evaluate(data, '$..items[0].id')), [1, VALUE_4]);
});

it('evaluates unions and slices', () => {
  assert.deepEqual(values(evaluate(data, '$.items[0,2].id')), [1, VALUE_3]);
  assert.deepEqual(values(evaluate(data, '$.items[1:].id')), [2, VALUE_3]);
  assert.deepEqual(values(evaluate(data, '$.items[::-1].id')), [VALUE_3, 2, 1]);
  assert.deepEqual(values(evaluate(data, '$.items[0:3:2].id')), [1, VALUE_3]);
});

it('evaluates comparisons and boolean filters', () => {
  assert.deepEqual(values(evaluate(data, '$.items[?(@.id > 1)].id')), [2, VALUE_3]);
  assert.deepEqual(values(evaluate(data, '$.items[?(@.enabled == true)].id')), [1, VALUE_3]);
  assert.deepEqual(values(evaluate(data, '$.items[?(@.id != 2)].id')), [1, VALUE_3]);
  assert.deepEqual(
    values(evaluate(data, '$.items[?((@.id == 1 || @.id == 3) && !(@.enabled == false))].id')),
    [1, VALUE_3],
  );
  assert.deepEqual(values(evaluate(data, '$.items[?(@.id >= 2 && @.id <= 3)].id')), [2, VALUE_3]);
});

it('filters object values as well as array elements', () => {
  assert.deepEqual(values(evaluate(data, '$.map[?(@.enabled == true)]')), [{ enabled: true }]);
});

it('returns no values for a missing path and ignores inherited properties', () => {
  assert.deepEqual(values(evaluate(data, '$.missing.path')), []);
  assert.deepEqual(values(evaluate(data, '$.toString')), []);
  assert.deepEqual(values(evaluate(data, '$.constructor')), []);
});

it('does not loop forever on circular data', () => {
  const circular = { name: 'root' };
  circular.self = circular;
  assert.deepEqual(values(evaluate(circular, '$..name')), ['root']);
});

it('reports malformed expressions and limits huge result sets', () => {
  assert.throws(() => evaluate(data, 'items'), /must start with \$/u);
  assert.throws(() => evaluate(data, '$.items['), /Missing closing \]/u);
  assert.throws(() => evaluate(data, '$.items[?(@.id ==)]'), /Expected a value/u);
  assert.throws(() => evaluate(data, '$.items[::0]'), /step cannot be zero/u);
  assert.throws(
    () =>
      evaluate(
        Array.from({ length: VALUE_2001 }, (_, i) => i),
        '$[*]',
      ),
    /2,000/u,
  );
});
