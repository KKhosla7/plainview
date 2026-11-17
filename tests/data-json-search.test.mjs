import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
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

async function openJson() {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-json');
  return { page, errors };
}

it('searches JSON values and clears the search field', async () => {
  const { page, errors } = await openJson();
  const search = page.getByLabel('Search JSON keys and values');
  await search.fill('label');
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length >= 2);
  assert.match(await page.locator('.pv-json-count').first().innerText(), /2 matches/u);

  await page.getByRole('button', { name: 'Clear search' }).click();
  assert.equal(await search.inputValue(), '');
  assert.equal(await page.locator('.pv-json-count').first().innerText(), '');

  await search.fill('"version": 1');
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length === 1);
  assert.match(await page.locator('.pv-json-count').first().innerText(), /1 match/u);
  assertNoErrors(errors);
  await page.close();
});

it('does not hijack shortcuts while typing', async () => {
  const { page, errors } = await openJson();
  const search = page.getByLabel('Search JSON keys and values');
  await search.fill('"version": 1');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  assert.equal(await search.inputValue(), '"version": 1');
  assert.equal(await page.locator('.pv-app.pv-show-source').count(), 0);

  await page.keyboard.press('Alt+s');
  assert.equal(await page.locator('.pv-app.pv-show-source').count(), 0);
  await search.blur();
  await page.keyboard.press('Alt+s');
  await page.waitForFunction(() =>
    document.querySelector('.pv-app')?.classList.contains('pv-show-source'),
  );
  await page.keyboard.press('Alt+s');
  await page.waitForFunction(
    () => !document.querySelector('.pv-app')?.classList.contains('pv-show-source'),
  );
  assertNoErrors(errors);
  await page.close();
});

it('copies a JSON path', async () => {
  const { page, errors } = await openJson();
  const pathButton = page.locator('.pv-json-path[data-json-path="$.name"]');
  assert.equal(await pathButton.count(), 1);
  await pathButton.click({ force: true });
  await page.waitForFunction(
    () => document.querySelector('.pv-json-path[data-json-path="$.name"]').textContent === 'Copied',
  );
  assertNoErrors(errors);
  await page.close();
});

it('runs JSONPath and JMESPath queries', async () => {
  const { page, errors } = await openJson();
  const query = page.getByLabel('Query expression');
  await query.fill('$.items[*].id');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-query-hit').length === 2);
  assert.match(await page.locator('.pv-json-query .pv-json-count').innerText(), /2 results/u);
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  assert.match(await page.locator('.pv-json-query-results').innerText(), /\$\.items\[0\]\.id/u);

  const language = page.getByLabel('Query language');
  await language.selectOption('jmespath');
  await query.fill('items[*].label');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-query-hit').length === 2);
  assert.match(await page.locator('.pv-json-query .pv-json-count').innerText(), /2 results/u);
  assertNoErrors(errors);
  await page.close();
});

it('reports empty and malformed JSONPath queries', async () => {
  const { page, errors } = await openJson();
  const query = page.getByLabel('Query expression');
  await query.fill('$.missing.path');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-json-status')?.textContent.includes('No matches'),
  );
  assert.match(
    await page.locator('.pv-json-status').innerText(),
    /No matches for \$\.missing\.path/u,
  );
  assert.match(await page.locator('.pv-json-query .pv-json-count').innerText(), /0 results/u);

  await query.fill('$[');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-json-status')?.textContent.includes('JSONPath error'),
  );
  assert.match(await page.locator('.pv-json-status').innerText(), /JSONPath error/u);
  assertNoErrors(errors);
  await page.close();
});
