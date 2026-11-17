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
    workers = [await context.waitForEvent('serviceworker', { timeout: 10_000 })];
  }
  await workers[0].evaluate(({ key, mode }) => chrome.storage.local.set({ [key]: mode }), {
    key: TreeModeKey,
    mode: value,
  });
}

function createLongValueJson() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-virtual-'));
  const file = path.join(dir, 'long-value.json');
  fs.writeFileSync(file, JSON.stringify({ scripts: { dsr: 'x'.repeat(400) } }));
  return { dir, file };
}

function createLargeJson() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-virtual-'));
  const file = path.join(dir, 'large.json');
  const rows = Array.from({ length: 1200 }, (_, index) => ({
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
    assert.ok((await page.locator('.pv-vrow').count()) > 8);
    assert.ok((await page.locator('.pv-vrow').count()) < 100);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /item-0/u);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /item-1/u);

    const search = page.getByLabel('Search JSON keys and values');
    await search.fill('item-1199');
    await page.waitForSelector('.pv-json-search-results:not([hidden])');
    await page.locator('.pv-json-search-result').first().click();
    await page.waitForSelector('.pv-vrow-active');
    assert.match(await page.locator('.pv-vrow-active').innerText(), /item-1199/u);
    assert.ok((await page.locator('.pv-vrow').count()) < 100);
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
    await page.waitForFunction(() => document.querySelectorAll('.pv-vrow').length > 8);
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

it('keeps the classic tree available by default', async () => {
  await setTreeMode('classic');
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  try {
    await page.waitForSelector('.pv-json');
    assert.equal(await page.locator('.pv-virtual-tree').count(), 0);
    assert.ok((await page.locator('.pv-json-key').count()) >= 5);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
