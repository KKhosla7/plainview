import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test as it } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';

const MAX_SOURCE_PREVIEW_CHARS = 210_000;
const MIN_FULL_SOURCE_CHARS = 500_000;
const LARGE_JSON_ROWS = 1200;
const ROW_BIO_LENGTH = 500;
const FULL_SOURCE_TIMEOUT_MS = 15_000;

let server;
let context;
let profile;

before(async () => {
  ({ server } = await startServer());
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
  await new Promise((resolve) => server.close(resolve));
});

function createLargeJson() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-large-'));
  const file = path.join(dir, 'large.json');
  const rows = Array.from({ length: LARGE_JSON_ROWS }, (_, index) => ({
    id: index,
    name: `item-${index}`,
    bio: 'x'.repeat(ROW_BIO_LENGTH),
    enabled: index % 2 === 0,
  }));
  fs.writeFileSync(file, JSON.stringify(rows));
  return { dir, file };
}

it('previews a large source file and returns to the top', async () => {
  const { dir, file } = createLargeJson();
  const { page, errors } = await openPage(context, pathToFileURL(file).href);
  try {
    await page.getByRole('tab', { name: 'Source' }).click();
    await page.waitForSelector('.pv-raw-code');
    assert.match(await page.locator('.pv-raw-status').innerText(), /Preview · first/u);
    const previewLength = await page
      .locator('.pv-raw-code')
      .evaluate((node) => node.textContent.length);
    assert.ok(previewLength < MAX_SOURCE_PREVIEW_CHARS, `preview is ${previewLength} characters`);

    await page.locator('.pv-raw-full').click();
    await page.waitForFunction(
      () => document.querySelector('.pv-raw-status')?.textContent.includes('Full source'),
      null,
      { timeout: FULL_SOURCE_TIMEOUT_MS },
    );
    const fullLength = await page
      .locator('.pv-raw-code')
      .evaluate((node) => node.textContent.length);
    assert.ok(fullLength > MIN_FULL_SOURCE_CHARS, `full source is ${fullLength} characters`);

    await page.getByRole('tab', { name: 'HTML' }).click();
    await page.waitForSelector('.pv-json', { state: 'visible' });
    await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
    const backToTop = page.getByRole('button', { name: 'Back to top' });
    await backToTop.waitFor({ state: 'visible' });
    await backToTop.click();
    await page.waitForFunction(() => globalThis.scrollY < 20);
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
