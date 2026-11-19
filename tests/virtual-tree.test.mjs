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
import TestConstants from './test-constants.json' with { type: 'json' };

const TreeModeKey = 'plainview.jsonTreeMode';

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

async function setTreeMode(value) {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [
      await context.waitForEvent('serviceworker', { timeout: TestConstants.WORKER_TIMEOUT_MS }),
    ];
  }
  await workers[0].evaluate(({ key, mode }) => chrome.storage.local.set({ [key]: mode }), {
    key: TreeModeKey,
    mode: value,
  });
}

function createLongValueJson() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-virtual-'));
  const file = path.join(dir, 'long-value.json');
  fs.writeFileSync(
    file,
    JSON.stringify({ scripts: { dsr: 'x'.repeat(TestConstants.LONG_VALUE_LENGTH) } }),
  );
  return { dir, file };
}

function createLargeJson() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-virtual-'));
  const file = path.join(dir, 'large.json');
  const rows = Array.from({ length: TestConstants.LARGE_ROW_COUNT }, (_, index) => ({
    id: index,
    name: `item-${index}`,
    enabled: index % 2 === 0,
  }));
  fs.writeFileSync(file, JSON.stringify(rows));
  return { dir, file };
}

it('renders a virtualized tree and reveals a search result', async () => {
  await setTreeMode('virtual');
  const { dir, file } = createLargeJson();
  const { page, errors } = await openPage(context, pathToFileURL(file).href);
  try {
    await page.waitForSelector('.pv-virtual-tree');
    assert.equal(await page.locator('.pv-tree-more').count(), 0);
    assert.ok((await page.locator('.pv-vrow').count()) > TestConstants.MIN_VIRTUAL_ROWS);
    assert.ok((await page.locator('.pv-vrow').count()) < TestConstants.MAX_RENDERED_ROWS);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /item-0/u);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /item-1/u);

    const search = page.getByLabel('Search JSON keys and values');
    await search.fill('item-1199');
    await page.waitForSelector('.pv-json-search-results:not([hidden])');
    await page.locator('.pv-json-search-result').first().click();
    await page.waitForSelector('.pv-vrow-active');
    assert.match(await page.locator('.pv-vrow-active').innerText(), /item-1199/u);
    const positions = await page.evaluate(() => {
      const active = document.querySelector('.pv-vrow-active').getBoundingClientRect();
      const tools = document.querySelector('.pv-json-tools').getBoundingClientRect();
      return { activeTop: active.top, toolsBottom: tools.bottom };
    });
    assert.ok(positions.activeTop >= positions.toolsBottom - 1);
    assert.ok((await page.locator('.pv-vrow').count()) < TestConstants.MAX_RENDERED_ROWS);
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

it('mounts every row when the virtual tree is shorter than the viewport', async () => {
  await setTreeMode('virtual');
  const { page, errors } = await openPage(context, `${base}/sample.yaml`);
  try {
    await page.waitForSelector('.pv-virtual-tree');
    await page.waitForFunction(
      (minimum) => document.querySelectorAll('.pv-vrow').length > minimum,
      TestConstants.MIN_VIRTUAL_ROWS,
    );
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /ratio/u);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /keywords/u);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /7 keys/u);
    const rootBraces = await page
      .locator('.pv-vrow')
      .first()
      .locator('.pv-json-punct')
      .allTextContents();
    assert.equal(rootBraces.filter((text) => text === '{' || text === '}').length, 2);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('keeps the key visible when a value is long', async () => {
  await setTreeMode('virtual');
  const { dir, file } = createLongValueJson();
  const { page, errors } = await openPage(context, pathToFileURL(file).href);
  try {
    await page.waitForSelector('.pv-virtual-tree');
    const row = page.locator('.pv-vrow').filter({ hasText: '"dsr"' }).first();
    const key = row.locator('.pv-json-key');
    const value = row.locator('.pv-json-string');
    assert.equal(await key.evaluate((node) => getComputedStyle(node).flexShrink), '0');
    assert.equal(await value.evaluate((node) => getComputedStyle(node).flexShrink), '1');
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

it('renders XML with the virtual tree and reveals search hits', async () => {
  await setTreeMode('virtual');
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  try {
    await page.waitForSelector('.pv-xml-virtual');
    assert.ok((await page.locator('.pv-vrow').count()) > TestConstants.MIN_XML_ROWS);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /catalog/u);
    await page.getByLabel('Search XML elements and text').fill('Nested');
    await page.waitForSelector('.pv-vrow.pv-xml-hit-active');
    assert.match(await page.locator('.pv-vrow.pv-xml-hit-active').innerText(), /Nested/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
