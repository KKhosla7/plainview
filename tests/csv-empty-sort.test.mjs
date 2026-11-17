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

it('keeps empty CSV cells last in both sort directions', async () => {
  const { page, errors } = await openPage(context, `${base}/sort-empty.csv`);
  try {
    await page.waitForSelector('.pv-csv-table');
    const nameHeader = page.getByRole('button', { name: 'name', exact: true });
    const names = () =>
      page
        .locator('.pv-csv-table tbody tr')
        .evaluateAll((rows) => rows.map((row) => row.cells[1].textContent.trim()));
    await nameHeader.click();
    await page.waitForFunction(
      () =>
        document.querySelector('.pv-csv-table tbody tr')?.cells[1].textContent.trim() === 'alpha',
    );
    assert.deepEqual(await names(), ['alpha', 'cherry', '']);
    await nameHeader.click();
    await page.waitForFunction(
      () =>
        document.querySelector('.pv-csv-table tbody tr')?.cells[1].textContent.trim() === 'cherry',
    );
    assert.deepEqual(await names(), ['cherry', 'alpha', '']);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
