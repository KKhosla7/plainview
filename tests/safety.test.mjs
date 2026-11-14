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

test('escapes raw HTML and blocks javascript: links', async () => {
  const { page, errors } = await openPage(context, `${base}/xss.md`);
  await page.waitForSelector('.pv-markdown');

  assert.equal(await page.evaluate(() => window.__plainviewXss), undefined);
  assert.equal(await page.locator('.pv-markdown script').count(), 0);
  assert.equal(await page.locator('.pv-markdown img').count(), 0);
  assert.equal(await page.locator('.pv-markdown .pv-link-blocked').count(), 1);
  assert.match(
    await page.locator('.pv-raw-html').first().innerText(),
    /<script>/,
  );

  assertNoErrors(errors);
  await page.close();
});

test('does not touch plain text files', async () => {
  const { page, errors } = await openPage(context, `${base}/plain.txt`);
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.pv-app').count(), 0);
  assertNoErrors(errors);
  await page.close();
});

test('does not touch normal HTML pages', async () => {
  const { page, errors } = await openPage(context, `${base}/page.html`);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.pv-app').count(), 0);
  assertNoErrors(errors);
  await page.close();
});
