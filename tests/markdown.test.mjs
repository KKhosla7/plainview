import assert from 'node:assert/strict';
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

test('renders a normal Markdown document with the HTML theme', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.mdv-markdown');

  assert.equal(await page.locator('.mdv-titleblock').count(), 1);
  assert.equal(await page.locator('.mdv-tb-cells').count(), 0);
  assert.equal(await page.locator('.mdv-sheet').count(), 0);
  assert.match(
    await page.locator('.mdv-titleblock h1').innerText(),
    /Plainview sample/,
  );
  assert.match(
    await page.locator('.mdv-tb-lede').innerText(),
    /A quick Markdown file/,
  );
  await page.evaluate(() => document.fonts.load('16px "IBM Plex Sans"'));
  assert.equal(
    await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans"')),
    true,
  );
  assert.equal(await page.locator('.mdv-code').count(), 1);
  assert.equal(await page.locator('.mdv-table-wrap table').count(), 1);
  assert.equal(await page.locator('.mdv-markdown blockquote').count(), 1);
  assert.equal(await page.locator('.mdv-pill').count(), 0);

  assert.equal(await page.locator('.mdv-toc-title').textContent(), 'Contents');
  assert.equal(await page.locator('.mdv-theme-label').textContent(), 'Theme');
  assert.equal(
    await page.locator('.mdv-theme-tab[aria-selected="true"]').count(),
    1,
  );
  assert.deepEqual(await page.locator('.mdv-toc-link').allTextContents(), [
    'Plainview sample',
    'Lists',
    'Code',
    'Table',
    'Diagram',
  ]);

  assertNoErrors(errors);
  await page.close();
});

test('highlights the current section in Contents', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.mdv-markdown');
  await page.waitForSelector('.mdv-toc-link.is-active');

  assert.equal(
    (await page.locator('.mdv-toc-link.is-active').innerText()).trim(),
    'Plainview sample',
  );

  await page.evaluate(() => document.getElementById('table').scrollIntoView());
  await page.waitForFunction(
    () =>
      document.querySelector('.mdv-toc-link.is-active')?.textContent.trim() ===
      'Table',
  );

  assertNoErrors(errors);
  await page.close();
});

test('renders Mermaid diagrams', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.mdv-markdown');
  await page.waitForSelector('.mdv-mermaid-ready svg', { timeout: 20000 });

  assert.ok((await page.locator('.mdv-mermaid svg').count()) >= 1);
  assertNoErrors(errors);
  await page.close();
});
