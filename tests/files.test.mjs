import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  fixtureUrl,
  launchExtension,
  openPage,
} from './helpers.mjs';

let context;
let profile;

before(async () => {
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
});

test('renders a local Markdown file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.md'));
  await page.waitForSelector('.mdv-markdown');
  assert.match(await page.locator('.mdv-markdown h1').innerText(), /Plainview sample/);
  assertNoErrors(errors);
  await page.close();
});

test('renders a local JSON file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.json'));
  await page.waitForSelector('.mdv-json');
  assert.ok((await page.locator('.mdv-json-key').count()) >= 5);
  assertNoErrors(errors);
  await page.close();
});

test('renders a local XML file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.xml'));
  await page.waitForSelector('.mdv-xml');
  assert.ok((await page.locator('.mdv-xml-tag').count()) >= 5);
  assertNoErrors(errors);
  await page.close();
});
