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
const MaxRichExportBytes = 450_000;

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
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);

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
    assert.equal(await exported.locator('.pv-doc-meta').count(), 0);

    await exported.getByRole('button', { name: 'Light theme' }).click();
    assert.equal(await exported.evaluate(() => document.documentElement.dataset.pvTheme), 'light');
    await exported.getByRole('button', { name: 'Dark theme' }).click();
    assert.equal(await exported.evaluate(() => document.documentElement.dataset.pvTheme), 'dark');

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
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);

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
