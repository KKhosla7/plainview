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
  assert.equal(
    await page.locator('.pv-json-search-row + .pv-json-count-row .pv-json-count').count(),
    1,
  );

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
  assert.equal(
    await page.locator('.pv-json-query-row + .pv-json-count-row .pv-json-count').count(),
    1,
  );
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

it('runs root-array JMESPath indexes', async () => {
  const { page, errors } = await openPage(context, `${base}/long.json`);
  await page.waitForSelector('.pv-json');
  const language = page.getByLabel('Query language');
  await language.selectOption('jmespath');
  const query = page.getByLabel('Query expression');
  await query.fill('[1].name');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-json-query .pv-json-count')?.textContent.includes('1 result'),
  );
  assert.match(await page.locator('.pv-json-query-results').innerText(), /\$\[1\]\.name/u);
  assertNoErrors(errors);
  await page.close();
});

it('keeps the active search hit below the sticky tools', async () => {
  const { page, errors } = await openJson();
  await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
  const search = page.getByLabel('Search JSON keys and values');
  await search.fill('label');
  await page.waitForSelector('.pv-json-hit-active');
  const positions = await page.evaluate(() => {
    const active = document.querySelector('.pv-json-hit-active').getBoundingClientRect();
    const tools = document.querySelector('.pv-json-tools').getBoundingClientRect();
    return { activeTop: active.top, toolsBottom: tools.bottom };
  });
  assert.ok(positions.activeTop >= positions.toolsBottom - 1);
  assertNoErrors(errors);
  await page.close();
});

it('maps JMESPath root-array indexes to the actual index', async () => {
  const { page, errors } = await openPage(context, `${base}/indexed.json`);
  await page.waitForSelector('.pv-json');
  const language = page.getByLabel('Query language');
  await language.selectOption('jmespath');
  const query = page.getByLabel('Query expression');
  await query.fill('[11].language');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  assert.match(await page.locator('.pv-json-query-results').innerText(), /\$\[11\]\.language/u);
  assert.doesNotMatch(
    await page.locator('.pv-json-query-results').innerText(),
    /\$\[3\]\.language/u,
  );
  assertNoErrors(errors);
  await page.close();
});

it('dismisses search and query results with Escape or an outside click', async () => {
  const { page, errors } = await openJson();
  const search = page.getByLabel('Search JSON keys and values');
  await search.fill('label');
  await page.waitForSelector('.pv-json-search-results:not([hidden])');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.pv-json-search-results', { state: 'hidden' });
  await search.click();
  await page.waitForSelector('.pv-json-search-results:not([hidden])');
  await page.locator('.pv-topbar').click({ position: { x: 5, y: 5 } });
  await page.waitForSelector('.pv-json-search-results', { state: 'hidden' });

  const query = page.getByLabel('Query expression');
  await query.fill('$.items[*].id');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.pv-json-query-results', { state: 'hidden' });
  await query.click();
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  await page.locator('.pv-topbar').click({ position: { x: 5, y: 5 } });
  await page.waitForSelector('.pv-json-query-results', { state: 'hidden' });
  assert.equal(await page.locator('.pv-json-query-results').isHidden(), true);
  assertNoErrors(errors);
  await page.close();
});
