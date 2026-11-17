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

const MaxSampleExportBytes = 40_000;
const MaxRichExportBytes = 800_000;
const LiveTableBordersKey = 'plainview.tableBorders';

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

async function toggleColumnLines(exported) {
  const borderCell = exported.locator('.pv-markdown table th').first();
  const beforeWidth = await borderCell.evaluate((node) => getComputedStyle(node).borderRightWidth);
  await exported.getByRole('button', { name: 'Show column lines' }).click();
  const afterWidth = await borderCell.evaluate((node) => getComputedStyle(node).borderRightWidth);
  const hideCount = await exported.getByRole('button', { name: 'Hide column lines' }).count();
  await exported.evaluate((key) => localStorage.setItem(key, 'false'), LiveTableBordersKey);
  await exported.reload();
  await exported.waitForSelector('.pv-table-borders-toggle');
  const persistedWidth = await borderCell.evaluate(
    (node) => getComputedStyle(node).borderRightWidth,
  );
  return {
    afterVisible: afterWidth !== '0px',
    beforeHidden: beforeWidth === '0px',
    hideCount,
    persistedVisible: persistedWidth !== '0px',
  };
}

function exportControlCounts(exported) {
  return Promise.all([
    exported.getByRole('button', { name: 'Export', exact: true }).count(),
    exported.getByRole('button', { name: 'Download HTML page' }).count(),
    exported.getByRole('button', { name: 'Toggle theme' }).count(),
    exported.getByRole('button', { name: 'Export data', exact: true }).count(),
  ]);
}

async function downloadHtml(page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForSelector('.pv-export-menu:not([hidden])');
  return page.getByRole('button', { name: 'Download HTML page' }).click();
}

async function openSample() {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-markdown', { state: 'visible' });
  return { page, errors };
}

it('exports a compressed standalone HTML file with Contents and theme controls', async () => {
  const { page, errors } = await openSample();
  const [download] = await Promise.all([page.waitForEvent('download'), downloadHtml(page)]);

  assert.equal(download.suggestedFilename(), 'sample.html');
  const file = await download.path();
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /^<!doctype html><html lang="en" data-pv-export="compressed"/u);
  assert.match(html, /DecompressionStream\("gzip"\)/u);
  assert.match(html, /data-pv-version="\d+\.\d+\.\d+"/u);
  assert.match(html, /<title>sample\.md<\/title>/u);
  assert.doesNotMatch(html, /pv-toc-link/u);
  assert.doesNotMatch(html, /Created with/u);
  assert.doesNotMatch(html, /<script[^>]+src=/iu);
  assert.ok(html.length < MaxSampleExportBytes, `compressed export is ${html.length} bytes`);

  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-export-'));
  const exportFile = path.join(exportDir, 'sample.html');
  fs.copyFileSync(file, exportFile);
  const exported = await context.newPage();
  try {
    await exported.goto(pathToFileURL(exportFile).href);
    await exported.waitForSelector('.pv-markdown');
    assert.equal(await exported.locator('.pv-toc').count(), 1);
    assert.match(await exported.locator('.pv-toc').innerText(), /CONTENTS|Contents/iu);
    assert.match(await exported.locator('.pv-toc-link.is-active').innerText(), /Plainview sample/u);
    assert.equal(await exported.locator('.pv-export-credit').innerText(), 'Created with Plainview');
    assert.equal(
      await exported
        .locator('.pv-export-credit')
        .evaluate((node) => getComputedStyle(node).position),
      'fixed',
    );
    assert.equal(await exported.locator('.pv-code-bar').count(), 0);
    assert.deepEqual(await exportControlCounts(exported), [0, 0, 1, 0]);
    assert.equal(await exported.locator('.pv-doc-meta').count(), 0);
    assert.deepEqual(await toggleColumnLines(exported), {
      afterVisible: true,
      beforeHidden: true,
      hideCount: 1,
      persistedVisible: true,
    });

    await exported.getByRole('button', { name: 'Toggle theme' }).click();
    assert.equal(await exported.evaluate(() => document.documentElement.dataset.pvTheme), 'dark');
    await exported.getByRole('button', { name: 'Toggle theme' }).click();
    assert.equal(await exported.evaluate(() => document.documentElement.dataset.pvTheme), 'light');

    assert.equal(await exported.getByRole('button', { name: 'Back to top' }).isHidden(), true);
    await exported.evaluate(() => document.querySelector('#table').scrollIntoView());
    await exported.waitForFunction(
      () => document.querySelector('.pv-toc-link.is-active')?.textContent.trim() === 'Table',
    );
    await exported.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
    const exportTop = exported.getByRole('button', { name: 'Back to top' });
    await exportTop.waitFor({ state: 'visible' });
    await exportTop.click();
    await exported.waitForFunction(() => globalThis.scrollY < 20);

    const hasMathFonts = await exported.evaluate(() =>
      [...document.querySelectorAll('style')].some((style) =>
        style.textContent.includes('data:font/woff2'),
      ),
    );
    assert.equal(hasMathFonts, false);
  } finally {
    await exported.close();
    fs.rmSync(exportDir, { recursive: true, force: true });
  }

  assertNoErrors(errors);
  await page.close();
});

it('embeds KaTeX styles and fonts when exporting math', async () => {
  const { page, errors } = await openPage(context, `${base}/rich.md`);
  await page.waitForSelector('.katex', { timeout: 10_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), downloadHtml(page)]);

  const file = await download.path();
  const html = fs.readFileSync(file, 'utf8');
  assert.equal(download.suggestedFilename(), 'rich.html');
  assert.match(html, /data-pv-export="compressed"/u);
  assert.ok(html.length < MaxRichExportBytes, `compressed math export is ${html.length} bytes`);

  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-export-'));
  const exportFile = path.join(exportDir, 'rich.html');
  fs.copyFileSync(file, exportFile);
  const exported = await context.newPage();
  try {
    await exported.goto(pathToFileURL(exportFile).href);
    await exported.waitForSelector('.katex', { timeout: 10_000 });
    const hasMathFonts = await exported.evaluate(() =>
      [...document.querySelectorAll('style')].some((style) =>
        style.textContent.includes('data:font/woff2'),
      ),
    );
    assert.equal(hasMathFonts, true);
  } finally {
    await exported.close();
    fs.rmSync(exportDir, { recursive: true, force: true });
  }

  assertNoErrors(errors);
  await page.close();
});

it('allows column resizing in exported HTML', async () => {
  const { page, errors } = await openSample();
  const [download] = await Promise.all([page.waitForEvent('download'), downloadHtml(page)]);
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-export-'));
  const exportFile = path.join(exportDir, 'sample.html');
  fs.copyFileSync(await download.path(), exportFile);
  const exported = await context.newPage();
  try {
    await exported.goto(pathToFileURL(exportFile).href);
    await exported.waitForSelector('.pv-table-resize');
    assert.equal(
      await exported
        .locator('.pv-markdown .pv-table-wrap')
        .evaluate((node) => getComputedStyle(node).overflowX),
      'hidden',
    );
    const handleLocator = exported.locator('.pv-table-resize').first();
    await handleLocator.scrollIntoViewIfNeeded();
    const header = exported.locator('.pv-markdown table th').first();
    const startWidth = (await header.boundingBox()).width;
    const handle = await handleLocator.boundingBox();
    const y = handle.y + handle.height / 2;
    await exported.mouse.move(handle.x + 3, y);
    await exported.mouse.down();
    await exported.mouse.move(handle.x + 43, y, { steps: 5 });
    await exported.mouse.up();
    const resized = (await header.boundingBox()).width;
    assert.ok(resized > startWidth);
    await exported.reload();
    await exported.waitForSelector('.pv-table-resize');
    const reloaded = (await header.boundingBox()).width;
    assert.ok(Math.abs(reloaded - resized) < 3);
  } finally {
    await exported.close();
    fs.rmSync(exportDir, { recursive: true, force: true });
  }
  assertNoErrors(errors);
  await page.close();
});

it('preserves resized column widths in exported HTML', async () => {
  const { page, errors } = await openSample();
  const sourceHeader = page.locator('.pv-markdown table th').first();
  const sourceHandle = page.locator('.pv-markdown .pv-table-resize').first();
  await sourceHandle.scrollIntoViewIfNeeded();
  const sourceWidth = (await sourceHeader.boundingBox()).width;
  const box = await sourceHandle.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 3, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 63, y, { steps: 5 });
  await page.mouse.up();
  const resizedWidth = (await sourceHeader.boundingBox()).width;
  assert.ok(resizedWidth > sourceWidth);
  await page.waitForTimeout(300);

  const [download] = await Promise.all([page.waitForEvent('download'), downloadHtml(page)]);
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-export-'));
  const exportFile = path.join(exportDir, 'sample.html');
  fs.copyFileSync(await download.path(), exportFile);
  const exported = await context.newPage();
  try {
    await exported.goto(pathToFileURL(exportFile).href);
    await exported.waitForSelector('.pv-markdown table');
    const exportedWidth = (await exported.locator('.pv-markdown table th').first().boundingBox())
      .width;
    assert.ok(Math.abs(exportedWidth - resizedWidth) < 3);
  } finally {
    await exported.close();
    fs.rmSync(exportDir, { recursive: true, force: true });
  }
  assertNoErrors(errors);
  await page.close();
});
