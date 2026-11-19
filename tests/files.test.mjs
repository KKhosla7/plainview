import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  fixtureUrl,
  launchExtension,
  openPage,
} from './helpers.mjs';
import TestConstants from './test-constants.json' with { type: 'json' };

let context;
let profile;

before(async () => {
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
});

it('renders a local Markdown file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.md'));
  await page.waitForSelector('.pv-markdown');
  assert.match(await page.locator('.pv-markdown h1').innerText(), /Plainview sample/u);
  assertNoErrors(errors);
  await page.close();
});

it('renders a local JSON file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.json'));
  await page.waitForSelector('.pv-json');
  assert.ok((await page.locator('.pv-json-key').count()) >= TestConstants.JSON_MIN_KEYS);
  assertNoErrors(errors);
  await page.close();
});

it('renders a local XML file', async () => {
  const { page, errors } = await openPage(context, fixtureUrl('sample.xml'));
  await page.waitForSelector('.pv-xml');
  assert.ok((await page.locator('.pv-xml-tag').count()) >= TestConstants.XML_MIN_TAGS);
  assertNoErrors(errors);
  await page.close();
});
