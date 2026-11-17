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

it('shows YAML block commands and keys without JSON quoting', async () => {
  const { page, errors } = await openPage(context, `${base}/package-scripts.yaml`);
  try {
    await page.waitForSelector('.pv-json');
    await page.waitForFunction(() =>
      document.querySelector('.pv-json')?.textContent.includes('browserify'),
    );
    const text = await page.locator('.pv-json').innerText();
    assert.match(text, /typescript\s*:\s*tsc/u);
    assert.match(text, /--isolatedModules/u);
    assert.doesNotMatch(text, /"scripts"/u);
    assert.doesNotMatch(text, /\\n/gu);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
