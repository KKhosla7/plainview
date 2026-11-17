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

it('renders a normal Markdown document with the HTML theme', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-markdown');

  assert.equal(await page.locator('.pv-titleblock').count(), 1);
  assert.equal(await page.locator('.pv-tb-cells').count(), 0);
  assert.equal(await page.locator('.pv-sheet').count(), 0);
  assert.match(await page.locator('.pv-titleblock h1').innerText(), /Plainview sample/u);
  assert.match(await page.locator('.pv-tb-lede').innerText(), /A quick Markdown file/u);
  await page.evaluate(() => document.fonts.load('16px "IBM Plex Sans"'));
  assert.equal(await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans"')), true);
  assert.equal(await page.locator('.pv-code').count(), 1);
  assert.equal(await page.locator('.pv-table-wrap table').count(), 1);
  assert.equal(await page.locator('.pv-markdown blockquote').count(), 1);
  assert.equal(await page.locator('.pv-pill').count(), 0);

  assert.equal(await page.locator('.pv-toc-title').textContent(), 'Contents');
  assert.equal(await page.locator('.pv-theme-label').textContent(), 'Theme');
  assert.equal(await page.locator('.pv-theme-tab[aria-selected="true"]').count(), 1);
  assert.deepEqual(await page.locator('.pv-toc-link').allTextContents(), [
    'Plainview sample',
    'Lists',
    'Code',
    'Table',
    'Diagram',
  ]);

  assertNoErrors(errors);
  await page.close();
});

it('highlights the current section in Contents', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-markdown');
  await page.waitForSelector('.pv-toc-link.is-active');

  assert.equal(
    (await page.locator('.pv-toc-link.is-active').innerText()).trim(),
    'Plainview sample',
  );

  await page.evaluate(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const target = document.querySelector('#table');
    globalThis.scrollTo(0, target.getBoundingClientRect().top + globalThis.scrollY - 80);
    root.style.scrollBehavior = previous;
  });
  await page.waitForFunction(
    () => document.querySelector('.pv-toc-link.is-active')?.textContent.trim() === 'Table',
    null,
    { polling: 100 },
  );

  assertNoErrors(errors);
  await page.close();
});

it('renders Mermaid diagrams', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-markdown');
  await page.waitForSelector('.pv-mermaid-ready svg', { timeout: 20_000 });

  assert.ok((await page.locator('.pv-mermaid svg').count()) >= 1);
  assertNoErrors(errors);
  await page.close();
});
it('highlights fenced code with the local highlighter', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.md`);
  await page.waitForSelector('.pv-code-highlighted', { timeout: 10_000 });

  assert.ok((await page.locator('.pv-code-highlighted .hljs-string').count()) >= 1);
  assert.ok((await page.locator('.pv-code-highlighted .hljs-title').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

it('renders inline and display math while leaving code literal', async () => {
  const { page, errors } = await openPage(context, `${base}/rich.md`);
  await page.waitForSelector('.katex-display', { timeout: 10_000 });

  assert.ok((await page.locator('.pv-markdown .katex').count()) >= 2);
  assert.equal(await page.locator('.pv-markdown code .katex').count(), 0);
  assert.ok(
    (await page.locator('.pv-markdown p code').allTextContents()).some((text) =>
      text.includes('$not math$'),
    ),
  );

  assertNoErrors(errors);
  await page.close();
});

it('does not fetch code or math vendors for a plain document', async () => {
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto(`${base}/simple.md`);
  await page.waitForSelector('.pv-markdown');
  await page.waitForTimeout(500);

  assert.equal(
    requests.some((url) => url.includes('/vendor/highlight/') || url.includes('/vendor/katex/')),
    false,
  );
  await page.close();
});
