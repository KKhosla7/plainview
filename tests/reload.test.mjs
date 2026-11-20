import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test as it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  startServer,
} from './helpers.mjs';
import TestConstants from './test-constants.json' with { type: 'json' };

const AutoReloadKey = 'plainview.autoReloadSource';

let server;
let base;
let context;
let profile;
let watched = '# Watched\n\nfirst version\n';
let automatic = '# Auto\n\nfirst version\n';
let flip = '# Flip\n\nA\n';

before(async () => {
  ({ server, base } = await startServer({
    '/watched.md': () => ({ body: watched, type: 'text/markdown; charset=utf-8' }),
    '/auto.md': () => ({ body: automatic, type: 'text/markdown; charset=utf-8' }),
    '/flip.md': () => ({ body: flip, type: 'text/markdown; charset=utf-8' }),
  }));
  ({ context, profile } = await launchExtension());
});

after(async () => {
  await closeExtension({ context, profile });
  await new Promise((resolve) => server.close(resolve));
});

async function setAutoReload(value) {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [
      await context.waitForEvent('serviceworker', { timeout: TestConstants.WORKER_TIMEOUT_MS }),
    ];
  }
  await workers[0].evaluate(({ key, enabled }) => chrome.storage.local.set({ [key]: enabled }), {
    key: AutoReloadKey,
    enabled: value,
  });
}

it('prompts before reloading a changed source', async () => {
  const { page, errors } = await openPage(context, `${base}/watched.md`);
  await page.waitForSelector('.pv-markdown h1');
  assert.match(await page.locator('.pv-markdown h1').innerText(), /Watched/u);
  await page.evaluate(() => {
    globalThis.__pvRefreshStayedInPage = true;
  });

  watched = '# Watched\n\nsecond version\n';
  await page.waitForSelector('.pv-change-banner:not([hidden])', {
    timeout: TestConstants.CHANGE_TIMEOUT_MS,
  });
  assert.match(await page.locator('.pv-change-text').innerText(), /Source changed/u);
  const placement = await page.evaluate(() => {
    const banner = document.querySelector('.pv-change-banner').getBoundingClientRect();
    const topbar = document.querySelector('.pv-topbar').getBoundingClientRect();
    return {
      bannerCenter: banner.x + banner.width / 2,
      viewportCenter: globalThis.innerWidth / 2,
      bannerTop: banner.y,
      topbarBottom: topbar.y + topbar.height,
    };
  });
  assert.ok(Math.abs(placement.bannerCenter - placement.viewportCenter) <= 2);
  assert.ok(placement.bannerTop >= placement.topbarBottom);
  assert.ok(placement.bannerTop <= placement.topbarBottom + TestConstants.BANNER_OFFSET);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('.pv-markdown h1')?.textContent.includes('Watched'),
  );
  await page.waitForFunction(() => document.body.innerText.includes('second version'));
  assert.equal(await page.evaluate(() => globalThis.__pvRefreshStayedInPage), true);

  assertNoErrors(errors);
  await page.close();
});

it('auto-reloads a changed source when the setting is enabled', async () => {
  await setAutoReload(true);
  const { page, errors } = await openPage(context, `${base}/auto.md`);
  await page.waitForSelector('.pv-markdown h1');
  await expect(page.locator('.pv-markdown h1')).toContainText('Auto');

  automatic = '# Auto\n\nsecond version\n';
  await page.waitForFunction(() => document.body.innerText.includes('second version'), null, {
    timeout: TestConstants.CHANGE_TIMEOUT_MS,
  });

  assertNoErrors(errors);
  await page.close();
  await setAutoReload(false);
});

it('prompts for a changed local file after the reader regains focus', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plainview-watch-'));
  const file = path.join(dir, 'local.md');
  writeFileSync(file, '# Local\n\nfirst version\n');
  const { page, errors } = await openPage(context, pathToFileURL(file).href);
  try {
    await page.waitForSelector('.pv-markdown h1');
    writeFileSync(file, '# Local\n\nsecond version\n');
    await page.evaluate(() => globalThis.dispatchEvent(new Event('focus')));
    await page.waitForSelector('.pv-change-banner:not([hidden])', {
      timeout: TestConstants.LOCAL_CHANGE_TIMEOUT_MS,
    });
    assert.match(await page.locator('.pv-change-text').innerText(), /Source changed/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

it('prompts again after the source returns to baseline and changes again', async () => {
  flip = '# Flip\n\nA\n';
  const { page, errors } = await openPage(context, `${base}/flip.md`);
  try {
    await page.waitForSelector('.pv-markdown h1');
    flip = '# Flip\n\nB\n';
    await page.evaluate(() => globalThis.dispatchEvent(new Event('focus')));
    await page.waitForSelector('.pv-change-banner:not([hidden])', {
      timeout: TestConstants.LOCAL_CHANGE_TIMEOUT_MS,
    });

    flip = '# Flip\n\nA\n';
    await page.evaluate(() => globalThis.dispatchEvent(new Event('focus')));
    await page.waitForSelector('.pv-change-banner', {
      state: 'hidden',
      timeout: TestConstants.LOCAL_CHANGE_TIMEOUT_MS,
    });

    flip = '# Flip\n\nB\n';
    await page.evaluate(() => globalThis.dispatchEvent(new Event('focus')));
    await page.waitForSelector('.pv-change-banner:not([hidden])', {
      timeout: TestConstants.LOCAL_CHANGE_TIMEOUT_MS,
    });
    assert.match(await page.locator('.pv-change-text').innerText(), /Source changed/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
