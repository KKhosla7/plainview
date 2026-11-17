import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';

const TableBordersKey = 'plainview.tableBorders';
const TableResizeKey = 'plainview.tableResize';

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

it('renders a YAML tree and its source syntax', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.yaml`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /YAML/u);
  assert.ok((await page.locator('.pv-json-key').count()) >= 5);
  assert.equal(await page.locator('.pv-error').count(), 0);

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-key');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

async function openCsvFixture(name = 'sample.csv') {
  const { page, errors } = await openPage(context, `${base}/${name}`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-csv-table');
  return { page, errors };
}

async function setStoredSetting(key, value) {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 10_000 })];
  }
  await workers[0].evaluate(
    ({ enabled, storageKey }) =>
      chrome.storage.local.set({
        [storageKey]: enabled,
      }),
    {
      enabled: value,
      storageKey: key,
    },
  );
}

async function setTableBorders(value) {
  await setStoredSetting(TableBordersKey, value);
}

async function setTableResize(value) {
  await setStoredSetting(TableResizeKey, value);
}

it('renders CSV as a bounded table with quoted fields', async () => {
  const { page, errors } = await openCsvFixture();
  assert.match(await page.locator('.pv-doc-meta').innerText(), /3 data rows · 3 columns/u);
  assert.equal(await page.locator('.pv-csv-table tbody tr').count(), 3);
  assert.match(await page.locator('.pv-csv-table').innerText(), /one, quoted/u);
  assert.match(await page.locator('.pv-csv-table').innerText(), /two\s+lines/u);

  const filter = page.getByLabel('Filter CSV rows');
  await filter.fill('beta');
  await page.waitForFunction(
    () => document.querySelectorAll('.pv-csv-table tbody tr').length === 1,
  );
  assert.match(await page.locator('.pv-csv-tools .pv-json-count').innerText(), /1 of 3 rows/u);
  assert.match(await page.locator('.pv-csv-table tbody tr').innerText(), /beta/u);

  await filter.fill('');
  await page.waitForFunction(
    () => document.querySelectorAll('.pv-csv-table tbody tr').length === 3,
  );
  assertNoErrors(errors);
  await page.close();
});

it('sorts CSV columns and highlights source syntax', async () => {
  const { page, errors } = await openCsvFixture();
  const valueHeader = page.getByRole('button', { name: 'Value', exact: true });
  const valueSortIcon = valueHeader.locator('.pv-csv-sort-icon');
  assert.equal(await valueSortIcon.innerText(), '↕');
  await valueHeader.click();
  assert.equal(await valueSortIcon.innerText(), '↑');
  await page.waitForFunction(() =>
    document.querySelector('.pv-csv-table tbody tr')?.textContent.includes('alpha'),
  );
  await valueHeader.click();
  assert.equal(await valueSortIcon.innerText(), '↓');
  await page.waitForFunction(() =>
    document.querySelector('.pv-csv-table tbody tr')?.textContent.includes('gamma'),
  );

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-string');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-punct').count()) >= 1);
  assertNoErrors(errors);
  await page.close();
});

it('detects semicolon-delimited CSV columns', async () => {
  const { page, errors } = await openPage(context, `${base}/semicolon.csv`);
  await page.waitForSelector('.pv-csv-table');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /5 data rows · 4 columns/u);
  const firstRow = page.locator('.pv-csv-table tbody tr').first();
  assert.equal(await firstRow.locator('td').count(), 4);
  assert.match(await firstRow.locator('td').nth(0).innerText(), /booker12/u);
  assert.match(await firstRow.locator('td').nth(3).innerText(), /Booker/u);

  assertNoErrors(errors);
  await page.close();
});

it('drops a trailing empty CSV column', async () => {
  const { page, errors } = await openPage(context, `${base}/trailing.csv`);
  await page.waitForSelector('.pv-csv-table');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /2 data rows · 2 columns/u);
  assert.equal(await page.locator('.pv-csv-header').count(), 2);

  assertNoErrors(errors);
  await page.close();
});

it('applies optional column borders to Markdown tables', async () => {
  await setTableBorders(false);
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  try {
    await page.waitForSelector('.pv-markdown table');
    const cell = page.locator('.pv-markdown table th').first();
    assert.equal(await cell.evaluate((node) => getComputedStyle(node).borderRightWidth), '0px');
    await setTableBorders(true);
    await page.waitForFunction(() => document.documentElement.dataset.pvTableBorders === 'on');
    assert.notEqual(await cell.evaluate((node) => getComputedStyle(node).borderRightWidth), '0px');
    assert.ok((await page.locator('.pv-table-resize').count()) > 0);
    assertNoErrors(errors);
  } finally {
    await setTableBorders(false);
    await page.close();
  }
});

it('renders TSV with the tab delimiter', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.tsv`);
  await page.waitForSelector('.pv-csv-table');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /2 data rows · 3 columns/u);
  assert.match(await page.locator('.pv-badge').innerText(), /TSV/u);

  assertNoErrors(errors);
  await page.close();
});
it('renders a TOML tree and its source syntax', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.toml`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /TOML/u);
  assert.ok((await page.locator('.pv-json-key').count()) >= 5);
  const query = page.getByLabel('Query expression');
  await query.fill('$..title');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-query-hit').length === 3);

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-key');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

it('ignores whitespace-only trailing CSV columns', async () => {
  const { page, errors } = await openCsvFixture('trailing-space.csv');
  assert.match(await page.locator('.pv-doc-meta').innerText(), /2 data rows · 2 columns/u);
  assert.equal(await page.locator('.pv-csv-header').count(), 2);
  assertNoErrors(errors);
  await page.close();
});

it('exposes column resize handles', async () => {
  await setTableResize(false);
  const { page, errors } = await openCsvFixture();
  try {
    assert.equal(await page.locator('.pv-table-resize').count(), 0);
    await setTableResize(true);
    await page.waitForFunction(() => document.querySelectorAll('.pv-table-resize').length === 3);
    assertNoErrors(errors);
  } finally {
    await setTableResize(true);
    await page.close();
  }
});
