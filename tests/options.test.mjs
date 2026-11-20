import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import { SETTING_KEYS } from '../src/core/setting-keys.js';
import { assertNoErrors, closeExtension, launchExtension } from './helpers.mjs';
import TestConstants from './test-constants.json' with { type: 'json' };

let context;
let profile;
let extensionId;

before(async () => {
  ({ context, profile } = await launchExtension());
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: WORKER_TIMEOUT_MS })];
  }
  extensionId = new URL(workers[0].url()).host;
});

after(async () => {
  await closeExtension({ context, profile });
});

const WORKER_TIMEOUT_MS = 10_000;
const ThemeKey = SETTING_KEYS.Theme;
const STATUS_VISIBLE_MS = 150;

it('opens the setup guide on installation', async () => {
  let onboarding = context.pages().find((page) => page.url().includes('/onboarding.html'));
  if (!onboarding) {
    onboarding = await context.waitForEvent('page', {
      predicate: (page) => page.url().includes('/onboarding.html'),
      timeout: WORKER_TIMEOUT_MS,
    });
  }
  await onboarding.waitForSelector('.onboarding h1');
  assert.equal(await onboarding.locator('.onboarding h1').innerText(), 'Setup guide');
  await onboarding.close();
});

it('settings page loads and remembers the auto-reload option', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('#autoReloadSources');
  await page.waitForSelector('html[data-pv-options-ready="true"]');
  assert.equal(await page.isChecked('#autoReloadSources'), false);
  assert.deepEqual(
    await Promise.all([page.isChecked('#exportUncompressed'), page.isChecked('#exportDataMenu')]),
    [false, false],
  );

  await page.check('#autoReloadSources');
  await page.check('#exportUncompressed');
  await page.check('#exportDataMenu');
  await page.waitForTimeout(STATUS_VISIBLE_MS);
  await page.reload();
  await page.waitForSelector('#autoReloadSources');
  await page.waitForSelector('html[data-pv-options-ready="true"]');
  assert.equal(await page.isChecked('#autoReloadSources'), true);
  assert.deepEqual(
    await Promise.all([page.isChecked('#exportUncompressed'), page.isChecked('#exportDataMenu')]),
    [true, true],
  );
  assert.match(await page.locator('#version').textContent(), /^\d+\.\d+\.\d+$/u);
  assert.match(
    await page.getByRole('link', { name: /Buy me a coffee/u }).getAttribute('href'),
    /buymeacoffee\.com\/karan\.khosla/u,
  );

  assertNoErrors(errors);
  await page.close();
});

it('settings page remembers table options', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('#tableBorders');
  await page.waitForSelector('html[data-pv-options-ready="true"]');
  assert.equal(await page.isChecked('#tableResize'), true);
  assert.equal(await page.locator('#tableLayout').inputValue(), 'wrap');

  await page.uncheck('#tableResize');
  await page.locator('#tableLayout').selectOption('scroll');
  await page.waitForTimeout(STATUS_VISIBLE_MS);
  await page.reload();
  await page.waitForSelector('#tableBorders');
  await page.waitForSelector('html[data-pv-options-ready="true"]');
  assert.equal(await page.isChecked('#tableResize'), false);
  assert.equal(await page.locator('#tableLayout').inputValue(), 'scroll');
  assertNoErrors(errors);
  await page.close();
});

it('settings page shares the reader theme', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('html[data-pv-options-ready="true"]');

  await page.evaluate((key) => chrome.storage.local.set({ [key]: 'dark' }), ThemeKey);
  await page.waitForFunction(() => document.documentElement.dataset.pvPageTheme === 'dark');
  assert.equal(await page.locator('.page-theme-toggle').getAttribute('aria-pressed'), 'true');

  await page.locator('.page-theme-toggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.pvPageTheme === 'light');
  assert.equal(
    await page.evaluate(async (key) => (await chrome.storage.local.get(key))[key], ThemeKey),
    'light',
  );
  assertNoErrors(errors);
  await page.close();
});

it('keeps the coffee icon consistent and suppresses the link after a drag', async () => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
  await page.waitForSelector('html[data-pv-options-ready="true"]');
  assert.equal(await page.locator('.coffee-icon').evaluate((icon) => icon.tagName), 'svg');

  const box = await page.locator('.coffee-fab').boundingBox();
  const pagesBefore = context.pages().length;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + TestConstants.COFFEE_DRAG_OFFSET,
    box.y + box.height / 2 + TestConstants.COFFEE_DRAG_OFFSET,
    { steps: TestConstants.DRAG_STEPS },
  );
  await page.mouse.up();
  await page.waitForTimeout(TestConstants.RELOAD_WAIT_MS);
  assert.equal(context.pages().length, pagesBefore);
  assertNoErrors(errors);
  await page.close();
});
