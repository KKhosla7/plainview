import assert from 'node:assert/strict';
import fs from 'node:fs';
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

async function openSample() {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-markdown', { state: 'visible' });
  return { page, errors };
}

it('Source view highlights Markdown and uses the full width', async () => {
  const { page, errors } = await openSample();
  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-pane', { state: 'visible' });
  await page.waitForSelector('.pv-raw-code .pv-syn-heading-marker');

  assert.ok((await page.locator('.pv-raw-code .pv-syn-strong').count()) >= 1);
  assert.ok((await page.locator('.pv-raw-code .pv-syn-list-marker').count()) >= 1);
  assert.ok((await page.locator('.pv-raw-code .pv-syn-fence').count()) >= 1);
  assert.ok((await page.locator('.pv-raw-code .pv-syn-link').count()) >= 1);
  assert.ok((await page.locator('.pv-raw-code .pv-syn-url').count()) >= 1);

  const widths = await page.evaluate(() => ({
    pane: document.querySelector('.pv-raw-pane').getBoundingClientRect().width,
    viewport: globalThis.innerWidth,
  }));
  assert.ok(widths.pane >= widths.viewport - 1, 'source pane spans the viewport');

  const copy = page.locator('.pv-raw-copy');
  assert.equal(await copy.innerText(), 'Copy source');
  await copy.click();
  await page.waitForFunction(
    () => document.querySelector('.pv-raw-copy').textContent !== 'Copy source',
  );
  assert.equal(await copy.innerText(), 'Copied');

  assertNoErrors(errors);
  await page.close();
});

it('downloads the original file', async () => {
  const { page, errors } = await openSample();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForSelector('.pv-export-menu:not([hidden])');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download complete data (MD)' }).click(),
  ]);

  assert.equal(download.suggestedFilename(), 'sample.md');
  const file = await download.path();
  assert.match(fs.readFileSync(file, 'utf8'), /^# Plainview sample/u);

  assertNoErrors(errors);
  await page.close();
});

it('Source view, theme and reading position survive a reload', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.pv-mermaid-ready svg', { timeout: 20_000 });

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.waitForFunction(() => document.documentElement.dataset.pvTheme === 'dark');
  assert.equal(
    await page.getByRole('button', { name: 'Toggle theme' }).getAttribute('aria-pressed'),
    'true',
  );

  await page.reload();
  await page.waitForSelector('.pv-app');
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.pvTheme === 'dark' &&
      document.querySelector('.pv-app')?.classList.contains('pv-show-source'),
  );
  assert.equal(
    await page.locator('.pv-raw-pane').evaluate((el) => getComputedStyle(el).display),
    'block',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Toggle theme' }).getAttribute('aria-pressed'),
    'true',
  );

  await page.getByRole('tab', { name: 'HTML' }).click();
  await page.waitForSelector('.pv-markdown', { state: 'visible' });
  const y = await page.evaluate(
    () => document.querySelector('#table').getBoundingClientRect().top + globalThis.scrollY - 80,
  );
  await page.evaluate((top) => globalThis.scrollTo(0, top), y);
  await page.waitForTimeout(700);
  const saved = await page.evaluate(() => globalThis.scrollY);
  assert.ok(saved > 100);

  await page.reload();
  await page.waitForSelector('.pv-markdown');
  await page.waitForTimeout(1500);
  const restored = await page.evaluate(() => globalThis.scrollY);
  assert.ok(Math.abs(restored - saved) <= 4, `${restored} ~= ${saved}`);

  assertNoErrors(errors);
  await page.close();
});

it('zoom enlarges the content without a page-level horizontal scrollbar', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.pv-toc-link.is-active');

  const beforeZoom = await page.evaluate(() => {
    const doc = document.querySelector('.pv-markdown');
    return {
      font: Number.parseFloat(getComputedStyle(doc).fontSize),
      width: doc.getBoundingClientRect().width,
    };
  });

  for (let i = 0; i < 15; i += 1) {
    await page.locator('.pv-zoom-button[aria-label="Zoom in"]').click();
  }
  await page.waitForTimeout(300);

  const afterZoom = await page.evaluate(() => {
    const main = document.querySelector('.pv-main');
    const doc = document.querySelector('.pv-markdown');
    return {
      zoom: getComputedStyle(document.documentElement).getPropertyValue('--pv-zoom').trim(),
      font: Number.parseFloat(getComputedStyle(doc).fontSize),
      width: doc.getBoundingClientRect().width,
      mainWidth: main.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
      mainScrollWidth: main.scrollWidth,
      mainClientWidth: main.clientWidth,
      viewport: globalThis.innerWidth,
    };
  });

  assert.equal(afterZoom.zoom, '2.5');
  assert.ok(afterZoom.font > beforeZoom.font * 2, 'the type grew');
  assert.ok(afterZoom.width >= beforeZoom.width - 2, 'the paper keeps the full reading column');
  assert.ok(
    Math.abs(afterZoom.width - afterZoom.mainWidth) <= 2,
    'the paper fills the main column',
  );
  assert.ok(afterZoom.scrollWidth <= afterZoom.viewport + 1, 'no page-level horizontal scroll');
  assert.ok(
    afterZoom.mainScrollWidth <= afterZoom.mainClientWidth + 1,
    'the main column does not overflow',
  );

  await page.locator('.pv-zoom-value').click();
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue('--pv-zoom').trim() === '1',
  );

  assertNoErrors(errors);
  await page.close();
});

it('clicking Contents lands on the heading and highlights the same item', async () => {
  const { page, errors } = await openSample();
  await page.waitForSelector('.pv-toc-link.is-active');

  await page.getByRole('link', { name: 'Table', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('.pv-toc-link.is-active')?.textContent.trim() === 'Table',
  );
  const top = await page.evaluate(
    () => document.querySelector('#table').getBoundingClientRect().top,
  );
  assert.ok(top >= 60 && top <= 110, `heading is below the sticky bar (${top})`);

  assertNoErrors(errors);
  await page.close();
});
