import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import { assertNoErrors, closeExtension, launchExtension } from './helpers.mjs';

let context;
let profile;
let extensionId;

before(async () => {
  ({ context, profile } = await launchExtension());
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 10_000 })];
  }
  extensionId = new URL(workers[0].url()).host;
});

after(async () => {
  await closeExtension({ context, profile });
});

it('settings page loads and remembers the auto-reload option', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('#autoReloadSources');
  assert.equal(await page.isChecked('#autoReloadSources'), false);
  assert.equal(await page.locator('#shortcutPreset').inputValue(), 'alt-s');
  assert.equal(await page.isChecked('#exportUncompressed'), false);

  await page.check('#autoReloadSources');
  await page.check('#exportUncompressed');
  await page.locator('#shortcutPreset').selectOption('off');
  await page.waitForTimeout(150);
  await page.reload();
  await page.waitForSelector('#autoReloadSources');
  assert.equal(await page.isChecked('#autoReloadSources'), true);
  assert.equal(await page.locator('#shortcutPreset').inputValue(), 'off');
  assert.equal(await page.isChecked('#exportUncompressed'), true);
  assert.match(await page.locator('#version').textContent(), /^\d+\.\d+\.\d+$/u);
  assert.match(
    await page.getByRole('link', { name: /Buy me a coffee/u }).getAttribute('href'),
    /buymeacoffee\.com\/karan\.khosla/u,
  );

  assertNoErrors(errors);
  await page.close();
});
