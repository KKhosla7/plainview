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

it('renders a JSON tree and its source syntax', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  await page.waitForSelector('.pv-json');

  assert.ok((await page.locator('.pv-json-key').count()) >= 5);
  assert.ok((await page.locator('.pv-json-string').count()) >= 2);
  assert.match(await page.locator('.pv-doc-meta').innerText(), /nodes/u);

  await page.getByRole('button', { name: 'Collapse all' }).click();
  assert.equal(
    await page.locator('.pv-json-node').evaluateAll((nodes) => nodes.every((node) => !node.open)),
    true,
  );
  await page.getByRole('button', { name: 'Expand all' }).click();
  assert.equal(
    await page.locator('.pv-json-node').evaluateAll((nodes) => nodes.every((node) => node.open)),
    true,
  );

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-key');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

it('reads JSONC comments and trailing commas', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.jsonc`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /JSONC/u);
  assert.equal(await page.locator('.pv-error').count(), 0);
  assert.ok((await page.locator('.pv-json-key').count()) >= 3);

  assertNoErrors(errors);
  await page.close();
});

it('reports invalid JSON without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.json`);
  await page.waitForSelector('.pv-error');
  assert.match(await page.locator('.pv-error-message').innerText(), /JSON|token|position/iu);
  assertNoErrors(errors);
  await page.close();
});

it('renders an XML tree with attributes, CDATA and comments', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  await page.waitForSelector('.pv-xml');

  assert.ok((await page.locator('.pv-xml-tag').count()) >= 5);
  assert.ok((await page.locator('.pv-xml-attr-name').count()) >= 3);
  assert.ok((await page.locator('.pv-xml-cdata').count()) >= 1);
  assert.ok((await page.locator('.pv-xml-comment').count()) >= 1);

  const style = await page.evaluate(() => ({
    width: document.querySelector('.pv-app').getBoundingClientRect().width,
    font: getComputedStyle(document.querySelector('.pv-xml')).fontFamily,
    metaBackground: getComputedStyle(document.querySelector('.pv-doc-meta')).backgroundColor,
  }));
  assert.ok(style.width > 500);
  assert.match(style.font, /mono/iu);
  assert.notEqual(style.metaBackground, 'rgba(0, 0, 0, 0)');

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-tag');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-attr').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});

it('reports invalid XML without crashing', async () => {
  const { page, errors } = await openPage(context, `${base}/bad.xml`);
  await page.waitForSelector('.pv-error');
  assert.match(await page.locator('.pv-error-message').innerText(), /mismatch|error|line/iu);
  assertNoErrors(errors);
  await page.close();
});
it('keeps JSON tools visible while scrolling and resolves indexed paths', async () => {
  const { page, errors } = await openPage(context, `${base}/long.json`);
  await page.waitForSelector('.pv-json-tools');

  await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(120);

  const positions = await page.evaluate(() => {
    const tools = document.querySelector('.pv-json-tools').getBoundingClientRect();
    const article = document.querySelector('.pv-doc').getBoundingClientRect();
    return {
      topbar: document.querySelector('.pv-topbar').getBoundingClientRect().toJSON(),
      tools: tools.toJSON(),
      toolsCenter: tools.x + tools.width / 2,
      searchLeft: document.querySelector('.pv-json-search').getBoundingClientRect().x - tools.x,
      queryRight:
        tools.right - document.querySelector('.pv-json-query').getBoundingClientRect().right,
      searchTop: document.querySelector('.pv-json-search').getBoundingClientRect().y - tools.y,
      searchBottom:
        tools.bottom - document.querySelector('.pv-json-search').getBoundingClientRect().bottom,
      articleCenter: article.x + article.width / 2,
    };
  });
  const topbarBottom = positions.topbar.y + positions.topbar.height;
  assert.ok(positions.tools.y >= topbarBottom - 2);
  assert.ok(positions.tools.y <= topbarBottom + 3);
  assert.ok(Math.abs(positions.toolsCenter - positions.articleCenter) <= 1);
  assert.ok(Math.abs(positions.searchLeft - positions.queryRight) <= 2);
  assert.ok(Math.abs(positions.searchTop - positions.searchBottom) <= 2);

  const query = page.getByLabel('Query expression');
  await query.fill('$[406].name');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  assert.match(await page.locator('.pv-json-query .pv-json-count').innerText(), /1 result/u);
  await page.locator('.pv-json-query-results .pv-json-search-result').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.pv-json-query-hit').length === 1);

  await query.fill('$[?(@.id >= 406 && @.id <= 408)].name');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForSelector('.pv-json-query-results:not([hidden])');
  assert.match(await page.locator('.pv-json-query .pv-json-count').innerText(), /3 results/u);
  assert.match(await page.locator('.pv-json-query-results').innerText(), /\$\[406\]\.name/u);

  assertNoErrors(errors);
  await page.close();
});
async function openXml() {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-xml');
  return { page, errors };
}

it('searches XML and evaluates XPath queries', async () => {
  const { page, errors } = await openXml();
  const search = page.getByLabel('Search XML elements and text');
  await search.fill('Markdown');
  await page.waitForFunction(() => document.querySelectorAll('.pv-xml-hit').length > 0);
  assert.match(await page.locator('.pv-xml-tools .pv-json-count').first().innerText(), /1 match/u);

  const query = page.getByLabel('XPath query');
  await query.fill('//book/title');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pv-xml-query-hit').length === 2);
  assert.match(
    await page.locator('.pv-xml-tools .pv-json-query .pv-json-count').innerText(),
    /2 results/u,
  );

  await query.fill('count(//book)');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-xml-tools .pv-json-status')?.textContent.includes('Result: 2'),
  );
  assertNoErrors(errors);
  await page.close();
});

it('reports XPath errors, aligns tags and copies an XPath', async () => {
  const { page, errors } = await openXml();
  const query = page.getByLabel('XPath query');
  await query.fill('//[');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-xml-tools .pv-json-status')?.textContent.includes('XPath error'),
  );

  const alignment = await page.evaluate(() =>
    [...document.querySelectorAll('.pv-xml-node')].map((node) => {
      const open = node.querySelector(':scope > summary .pv-xml-punct');
      const close = node.querySelector(':scope > .pv-xml-close .pv-xml-punct');
      return Math.abs(open.getBoundingClientRect().x - close.getBoundingClientRect().x);
    }),
  );
  assert.ok(alignment.every((difference) => difference <= 1));

  const pathButton = page.locator('.pv-xml-path[data-xpath="/catalog/book[2]/title[1]"]');
  assert.equal(await pathButton.count(), 1);
  await pathButton.click({ force: true });
  await page.waitForFunction(
    () =>
      document.querySelector('.pv-xml-path[data-xpath="/catalog/book[2]/title[1]"]')
        ?.textContent === 'Copied',
  );
  assertNoErrors(errors);
  await page.close();
});

it('does not show a source-change prompt for unchanged XML', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  await page.waitForSelector('.pv-app');
  if (await page.locator('.pv-app.pv-show-source').count()) {
    await page.getByRole('tab', { name: 'HTML' }).click();
  }
  await page.waitForSelector('.pv-xml');
  await page.waitForTimeout(3200);
  assert.equal(await page.locator('.pv-change-banner:not([hidden])').count(), 0);
  assertNoErrors(errors);
  await page.close();
});
