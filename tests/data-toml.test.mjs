import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';
import TestConstants from './test-constants.json' with { type: 'json' };

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

it('renders a TOML tree and its source syntax', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.toml`);
  await page.waitForSelector('.pv-json');

  assert.match(await page.locator('.pv-doc-meta').innerText(), /TOML/u);
  assert.ok((await page.locator('.pv-json-key').count()) >= TestConstants.MIN_KEYS);
  const query = page.getByLabel('Query expression');
  await query.fill('$..title');
  await page.getByRole('button', { name: 'Query', exact: true }).click();
  await page.waitForFunction(() => {
    const EXPECTED_HITS = 3;
    return document.querySelectorAll('.pv-json-query-hit').length === EXPECTED_HITS;
  });

  await page.getByRole('tab', { name: 'Source' }).click();
  await page.waitForSelector('.pv-raw-code .pv-syn-key');
  assert.ok((await page.locator('.pv-raw-code .pv-syn-string').count()) >= 1);

  assertNoErrors(errors);
  await page.close();
});
