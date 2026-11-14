import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';

let server;
let base;
let context;
let profile;

before(async () => {
  ({ server, base } = await startServer());
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
  await new Promise((resolve) => server.close(resolve));
});

test('renders a JSON tree and its source syntax', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  await page.waitForSelector('.mdv-json');

  assert.ok((await page.locator('.mdv-json-key').count()) >= 5);
  assert.ok((await page.locator('.mdv-json-string').count()) >= 2);
  assert.match(await page.locator('.mdv-doc-meta').innerText(), /nodes/);

  await page.getByRole('button', { name: 'Collapse all' }).click();
  assert.equal(
    await page.locator('.mdv-json-node').evaluateAll((nodes) =>
      nodes.every((node) => !node.open),
    ),
    true,
  );
  await page.getByRole('button', { name: 'Expand all' }).click();
  assert.equal(
    await page.locator('.mdv-json-node').evaluateAll((nodes) =>
      nodes.every((node) => node.open),
    ),
    true,
  );

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.mdv-raw-code .mdv-syn-key');
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

test('reads JSONC comments and trailing commas', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.jsonc`);
  await page.waitForSelector('.mdv-json');

  assert.match(await page.locator('.mdv-doc-meta').innerText(), /JSONC/);
  assert.equal(await page.locator('.mdv-error').count(), 0);
  assert.ok((await page.locator('.mdv-json-key').count()) >= 3);

  assertNoErrors(errors);
  await page.close();
});

test('reports invalid JSON without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.json`);
  await page.waitForSelector('.mdv-error');
  assert.match(await page.locator('.mdv-error-message').innerText(), /JSON|token|position/i);
  assertNoErrors(errors);
  await page.close();
});

test('renders an XML tree with attributes, CDATA and comments', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  await page.waitForSelector('.mdv-xml');

  assert.ok((await page.locator('.mdv-xml-tag').count()) >= 5);
  assert.ok((await page.locator('.mdv-xml-attr-name').count()) >= 3);
  assert.ok((await page.locator('.mdv-xml-cdata').count()) >= 1);
  assert.ok((await page.locator('.mdv-xml-comment').count()) >= 1);

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.mdv-raw-code .mdv-syn-tag');
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-attr').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

test('reports invalid XML without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.xml`);
  await page.waitForSelector('.mdv-error');
  assert.match(await page.locator('.mdv-error-message').innerText(), /mismatch|error|line/i);
  assertNoErrors(errors);
  await page.close();
});
