import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test as it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';

const RowCount = 20_000;
const MaxRenderedRows = 200;

let context;
let profile;
const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
let server;
let base;
let file;

before(async () => {
  ({ server, base } = await startServer());
  ({ context, profile } = await launchExtension());
  file = path.join(fixtures, 'large-generated.csv');
  const rows = ['id,name,value'];
  for (let index = 0; index < RowCount; index += 1) {
    rows.push(`${index},item-${index},${index * 2}`);
  }
  fs.writeFileSync(file, rows.join('\n'));
});

after(async () => {
  await closeExtension({ context, profile });
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(file, { force: true });
});

it('virtualizes a large CSV table', async () => {
  const { page, errors } = await openPage(context, `${base}/large-generated.csv`);
  try {
    await page.waitForSelector('.pv-csv-table');
    assert.equal(await page.locator('.pv-csv-spacer').count(), 2);
    assert.ok((await page.locator('tbody tr:not(.pv-csv-spacer)').count()) < MaxRenderedRows);
    assert.match(await page.locator('.pv-json-count').innerText(), /20,000 of 20,000/u);
    await page.locator('.pv-csv-wrap').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await page.waitForFunction(
      () => document.querySelector('.pv-csv-wrap')?.innerText.includes('item-19999'),
      null,
      { timeout: 10_000 },
    );
    assert.ok((await page.locator('tbody tr:not(.pv-csv-spacer)').count()) < MaxRenderedRows);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
