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
  await page.waitForSelector('.pv-json');

  assert.ok((await page.locator('.pv-json-key').count()) >= 5);
  assert.ok((await page.locator('.pv-json-string').count()) >= 2);
  assert.match(await page.locator('.pv-doc-meta').innerText(), /nodes/);

  await page.getByRole('button', { name: 'Collapse all' }).click();
  assert.equal(
    await page.locator('.pv-json-node').evaluateAll((nodes) =>
      nodes.every((node) => !node.open),
    ),
    true,
  );
  await page.getByRole('button', { name: 'Expand all' }).click();
  assert.equal(
    await page.locator('.pv-json-node').evaluateAll((nodes) =>
      nodes.every((node) => node.open),
    ),
    true,
  );

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-key');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

test('reads JSONC comments and trailing commas', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.jsonc`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /JSONC/);
  assert.equal(await page.locator('.pv-error').count(), 0);
  assert.ok((await page.locator('.pv-json-key').count()) >= 3);

  assertNoErrors(errors);
  await page.close();
});

test('reports invalid JSON without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.json`);
  await page.waitForSelector('.pv-error');
  assert.match(await page.locator('.pv-error-message').innerText(), /JSON|token|position/i);
  assertNoErrors(errors);
  await page.close();
});

test('renders an XML tree with attributes, CDATA and comments', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  await page.waitForSelector('.pv-xml');

  assert.ok((await page.locator('.pv-xml-tag').count()) >= 5);
  assert.ok((await page.locator('.pv-xml-attr-name').count()) >= 3);
  assert.ok((await page.locator('.pv-xml-cdata').count()) >= 1);
  assert.ok((await page.locator('.pv-xml-comment').count()) >= 1);

  const style = await page.evaluate(() => ({
    width: document.querySelector('.pv-app').getBoundingClientRect().width,
    font: getComputedStyle(document.querySelector('.pv-xml')).fontFamily,
    metaBackground: getComputedStyle(
      document.querySelector('.pv-doc-meta'),
    ).backgroundColor,
  }));
  assert.ok(style.width > 500);
  assert.match(style.font, /mono/i);
  assert.notEqual(style.metaBackground, 'rgba(0, 0, 0, 0)');

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-tag');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-attr').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

test('reports invalid XML without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.xml`);
  await page.waitForSelector('.pv-error');
  assert.match(await page.locator('.pv-error-message').innerText(), /mismatch|error|line/i);
  assertNoErrors(errors);
  await page.close();
});
