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

async function openJsonl() {
  const { page, errors } = await openPage(context, `${base}/sample.jsonl`);
  await page.waitForSelector('.pv-json');
  await page.waitForFunction(() =>
    document.querySelector('.pv-json')?.textContent.includes('alpha'),
  );
  return { page, errors };
}

it('renders JSONL as records and exports JSONL lines', async () => {
  const { page, errors } = await openJsonl();
  try {
    assert.match(await page.locator('.pv-badge').innerText(), /JSONL/u);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForSelector('.pv-export-menu:not([hidden])');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download complete data/u }).click(),
    ]);
    assert.equal(download.suggestedFilename(), 'sample.jsonl');
    const lines = fs
      .readFileSync(await download.path(), 'utf8')
      .trim()
      .split('\n');
    assert.equal(lines.length, 3);
    assert.deepEqual(JSON.parse(lines[0]), { id: 1, name: 'alpha', ok: true });
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('exports a self-contained JSONL HTML reader', async () => {
  const { page, errors } = await openJsonl();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-jsonl-'));
  try {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForSelector('.pv-export-menu:not([hidden])');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download HTML page' }).click(),
    ]);
    const file = path.join(dir, 'sample.html');
    fs.copyFileSync(await download.path(), file);
    const exported = await context.newPage();
    try {
      await exported.goto(pathToFileURL(file).href);
      await exported.waitForSelector('.pv-json');
      await exported.waitForFunction(() =>
        document.querySelector('.pv-json')?.textContent.includes('alpha'),
      );
      assert.match(await exported.locator('.pv-badge').innerText(), /JSONL/u);
    } finally {
      await exported.close();
    }
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
