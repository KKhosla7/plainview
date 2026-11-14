import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
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

async function openSample() {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.mdv-app');
  if (await page.locator('.mdv-app.mdv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.mdv-markdown', { state: 'visible' });
  return { page, errors };
}

test('Source view highlights Markdown and uses the full width', async () => {
  const { page, errors } = await openSample();
  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.mdv-raw-pane', { state: 'visible' });
  await page.waitForSelector('.mdv-raw-code .mdv-syn-heading-marker');

  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-strong').count()) >= 1);
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-list-marker').count()) >= 1);
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-fence').count()) >= 1);
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-link').count()) >= 1);
  assert.ok((await page.locator('.mdv-raw-code .mdv-syn-url').count()) >= 1);

  const widths = await page.evaluate(() => ({
    pane: document.querySelector('.mdv-raw-pane').getBoundingClientRect().width,
    viewport: window.innerWidth,
  }));
  assert.ok(widths.pane >= widths.viewport - 1, 'source pane spans the viewport');

  const copy = page.locator('.mdv-raw-copy');
  assert.equal(await copy.innerText(), 'Copy source');
  await copy.click();
  await page.waitForFunction(
    () => document.querySelector('.mdv-raw-copy').textContent !== 'Copy source',
  );
  assert.equal(await copy.innerText(), 'Copied');

  assertNoErrors(errors);
  await page.close();
});

test('downloads the original file', async () => {
  const { page, errors } = await openSample();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);

  assert.equal(download.suggestedFilename(), 'sample.md');
  const file = await download.path();
  assert.match(fs.readFileSync(file, 'utf8'), /^# Plainview sample/);

  assertNoErrors(errors);
  await page.close();
});

test('Source view, theme and reading position survive a reload', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.mdv-mermaid-ready svg', { timeout: 20000 });

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.waitForFunction(
    () => document.documentElement.dataset.mdvTheme === 'dark',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Dark theme' }).getAttribute('aria-selected'),
    'true',
  );

  await page.reload();
  await page.waitForSelector('.mdv-app');
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.mdvTheme === 'dark' &&
      document.querySelector('.mdv-app')?.classList.contains('mdv-show-source'),
  );
  assert.equal(
    await page.locator('.mdv-raw-pane').evaluate((el) => getComputedStyle(el).display),
    'block',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Dark theme' }).getAttribute('aria-selected'),
    'true',
  );

  await page.getByRole('tab', { name: 'HTML' }).click();
  await page.waitForSelector('.mdv-markdown', { state: 'visible' });
  const y = await page.evaluate(
    () => document.getElementById('table').getBoundingClientRect().top + window.scrollY - 80,
  );
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(700);
  const saved = await page.evaluate(() => window.scrollY);
  assert.ok(saved > 100);

  await page.reload();
  await page.waitForSelector('.mdv-markdown');
  await page.waitForTimeout(1500);
  const restored = await page.evaluate(() => window.scrollY);
  assert.ok(Math.abs(restored - saved) <= 4, `${restored} ~= ${saved}`);

  assertNoErrors(errors);
  await page.close();
});

test('zoom enlarges the content without a page-level horizontal scrollbar', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.mdv-toc-link.is-active');

  const before = await page.evaluate(() => {
    const doc = document.querySelector('.mdv-markdown');
    return {
      font: Number.parseFloat(getComputedStyle(doc).fontSize),
      width: doc.getBoundingClientRect().width,
    };
  });

  for (let i = 0; i < 15; i += 1) {
    await page.locator('.mdv-zoom-button[aria-label="Zoom in"]').click();
  }
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => {
    const main = document.querySelector('.mdv-main');
    const doc = document.querySelector('.mdv-markdown');
    return {
      zoom: getComputedStyle(document.documentElement).getPropertyValue('--mdv-zoom').trim(),
      font: Number.parseFloat(getComputedStyle(doc).fontSize),
      width: doc.getBoundingClientRect().width,
      mainWidth: main.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
      mainScrollWidth: main.scrollWidth,
      mainClientWidth: main.clientWidth,
      viewport: window.innerWidth,
    };
  });

  assert.equal(after.zoom, '2.5');
  assert.ok(after.font > before.font * 2, 'the type grew');
  assert.ok(after.width >= before.width - 2, 'the paper keeps the full reading column');
  assert.ok(Math.abs(after.width - after.mainWidth) <= 2, 'the paper fills the main column');
  assert.ok(after.scrollWidth <= after.viewport + 1, 'no page-level horizontal scroll');
  assert.ok(after.mainScrollWidth <= after.mainClientWidth + 1, 'the main column does not overflow');

  await page.locator('.mdv-zoom-value').click();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--mdv-zoom')
        .trim() === '1',
  );

  assertNoErrors(errors);
  await page.close();
});

test('clicking Contents lands on the heading and highlights the same item', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.mdv-toc-link.is-active');

  await page.getByRole('link', { name: 'Table', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.mdv-toc-link.is-active')?.textContent.trim() ===
      'Table',
  );
  const top = await page.evaluate(
    () => document.getElementById('table').getBoundingClientRect().top,
  );
  assert.ok(top >= 60 && top <= 110, `heading is below the sticky bar (${top})`);

  assertNoErrors(errors);
  await page.close();
});
