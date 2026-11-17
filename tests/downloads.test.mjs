import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import { closeExtension, fixtureUrl, launchExtension, startServer } from './helpers.mjs';

let server;
let base;
let context;
let profile;

const csv = 'Name,Value\nalpha,1\nbeta,2\n';
const yaml = 'name: plainview\nitems:\n  - one\n  - two\n';

before(async () => {
  ({ server, base } = await startServer({
    '/page.html': () => '<a id="download-csv" href="/data.csv">download csv</a>',
    '/data.csv': () => ({
      body: csv,
      type: 'text/csv; charset=utf-8',
      headers: { 'content-disposition': 'attachment; filename="data.csv"' },
    }),
    '/scripts.yml': () => ({
      body: yaml,
      type: 'text/plain; charset=utf-8',
    }),
  }));
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
  await new Promise((resolve) => server.close(resolve));
});

async function serviceWorker() {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 10_000 })];
  }

  return workers[0];
}

async function extensionId() {
  return new URL((await serviceWorker()).url()).host;
}

it('opens a downloaded CSV attachment in the viewer tab', async () => {
  const page = await context.newPage();
  await page.goto(`${base}/page.html`);

  const [viewer] = await Promise.all([
    context.waitForEvent('page', { timeout: 15_000 }),
    page.click('#download-csv'),
  ]);
  await viewer.waitForSelector('.pv-csv-table', { timeout: 15_000 });

  assert.match(viewer.url(), /src\/viewer\.html/u);
  assert.match(await viewer.locator('.pv-badge').innerText(), /CSV/u);
  assert.equal(await viewer.locator('.pv-csv-table tbody tr').count(), 2);
  assert.match(await viewer.locator('.pv-csv-table').innerText(), /alpha\s+1/u);
  const remaining = await (await serviceWorker()).evaluate(() => chrome.downloads.search({}));
  assert.equal(remaining.length, 0);

  await viewer.close();
  await page.close();
});

it('opens a YAML URL through the viewer page', async () => {
  const id = await extensionId();
  const page = await context.newPage();
  const target = encodeURIComponent(`${base}/scripts.yml`);
  await page.goto(`chrome-extension://${id}/src/viewer.html?url=${target}&name=scripts.yml`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-badge').innerText(), /YAML/u);
  assert.match(await page.locator('.pv-doc-meta').innerText(), /YAML/u);
  assert.ok((await page.locator('.pv-json-key').count()) >= 2);

  await page.close();
});
it('opens a local CSV file through the viewer', async () => {
  const sourcePage = await context.newPage();
  const viewerPromise = context.waitForEvent('page', { timeout: 15_000 });
  await sourcePage.goto(fixtureUrl('sample.csv')).then(
    () => true,
    () => false,
  );

  const viewer = await viewerPromise;
  await viewer.waitForSelector('.pv-csv-table', { timeout: 15_000 });
  assert.match(
    viewer.locator('.pv-badge') ? await viewer.locator('.pv-badge').innerText() : '',
    /CSV/u,
  );
  assert.ok((await viewer.locator('.pv-csv-table tbody tr').count()) >= 3);

  await viewer.close();
  await sourcePage.close();
});

it('opens a page-generated Blob TOML download', async () => {
  const page = await context.newPage();
  await page.goto(`${base}/blob-download.html`);
  const [viewer] = await Promise.all([
    context.waitForEvent('page', { timeout: 15_000 }),
    page.click('#download-toml'),
  ]);
  await viewer.waitForSelector('.pv-json', { timeout: 15_000 });
  assert.match(await viewer.locator('.pv-badge').innerText(), /TOML/u);
  assert.match(await viewer.locator('.pv-json').innerText(), /Blob TOML/u);
  await viewer.close();
  await page.close();
});

it('opens a page-generated Blob CSV download', async () => {
  const page = await context.newPage();
  await page.goto(`${base}/blob-download.html`);
  const [viewer] = await Promise.all([
    context.waitForEvent('page', { timeout: 15_000 }),
    page.click('#download-csv'),
  ]);
  await viewer.waitForSelector('.pv-csv-table', { timeout: 15_000 });
  assert.match(await viewer.locator('.pv-badge').innerText(), /CSV/u);
  assert.match(await viewer.locator('.pv-csv-table').innerText(), /alpha\s+1/u);
  await viewer.close();
  await page.close();
});
