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

const MaxSourcePreviewChars = 210_000;
const MinimumFullSourceChars = 500_000;

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
  const rows = Array.from({ length: 1200 }, (_, index) => ({
    id: index,
    name: `item-${index}`,
    bio: 'x'.repeat(500),
    enabled: index % 2 === 0,
  }));
  fs.writeFileSync(file, JSON.stringify(rows));
  return { dir, file };
}

it('progressively renders a large JSON tree', async () => {
  const { dir, file } = createLargeJson();
  const { page, errors } = await openPage(context, pathToFileURL(file).href);
  try {
    await page.waitForSelector('.pv-json');
    assert.match(await page.locator('.pv-doc-meta').innerText(), /\+ nodes/u);
    assert.equal(await page.locator('.pv-tree-more').count(), 1);

    const search = page.getByLabel('Search JSON keys and values');
    await search.fill('item-1199');
    await page.waitForSelector('.pv-json-search-results:not([hidden])');
    const results = page.locator('.pv-json-search-results:not(.pv-json-query-results)');
    assert.match(await results.innerText(), /\$\[1199\]\.name/u);
    assert.match(await results.innerText(), /item-1199/u);

    const nodesBefore = await page.locator('.pv-json-node').count();
    await page.locator('.pv-tree-more').first().click();
    await page.waitForFunction(
      (previousCount) => document.querySelectorAll('.pv-json-node').length > previousCount,
      nodesBefore,
    );
    await search.click();
    await results.locator('.pv-json-search-result').first().click();
    await page.waitForSelector('.pv-json-path[data-json-path="$[1199].name"]');
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

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
    assert.ok(previewLength < MaxSourcePreviewChars, `preview is ${previewLength} characters`);

    await page.locator('.pv-raw-full').click();
    await page.waitForFunction(
      () => document.querySelector('.pv-raw-status')?.textContent.includes('Full source'),
      null,
      { timeout: 15_000 },
    );
    const fullLength = await page
      .locator('.pv-raw-code')
      .evaluate((node) => node.textContent.length);
    assert.ok(fullLength > MinimumFullSourceChars, `full source is ${fullLength} characters`);

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
