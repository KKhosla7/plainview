import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
} from './helpers.mjs';

let context;
let profile;
let extensionId;

before(async () => {
  ({ context, profile } = await launchExtension());
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 10000 })];
  }
  extensionId = new URL(workers[0].url()).host;
});

after(async () => {
  await closeExtension({ context, profile });
});

test('settings page loads and remembers the auto-open option', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('#autoOpen');
  assert.equal(await page.isChecked('#autoOpen'), false);

  await page.check('#autoOpen');
  await page.waitForTimeout(150);
  await page.reload();
  await page.waitForSelector('#autoOpen');
  assert.equal(await page.isChecked('#autoOpen'), true);
  assert.match(
    await page.locator('#version').textContent(),
    /^\d+\.\d+\.\d+$/,
  );

  assertNoErrors(errors);
  await page.close();
});
