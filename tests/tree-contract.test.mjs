import assert from 'node:assert/strict';
import { after, before, test as it } from 'node:test';
import {
  assertNoErrors,
  closeExtension,
  launchExtension,
  openPage,
  setSetting,
  startServer,
} from './helpers.mjs';

const TreeModeKey = 'plainview.jsonTreeMode';
const EXPECTED_KEYS = 5;
const MIN_VIRTUAL_ROWS = 3;
const COLLAPSED_ROWS = 4;

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

async function openJson(mode) {
  await setSetting(context, TreeModeKey, mode);
  return openPage(context, `${base}/sample.json`);
}

it('classic JSON tree supports collapse, expand and keys', async () => {
  const { page, errors } = await openJson('classic');
  try {
    await page.waitForSelector('.pv-json .pv-json-node');
    assert.equal(await page.locator('.pv-virtual-tree').count(), 0);
    assert.ok((await page.locator('.pv-json-key').count()) >= EXPECTED_KEYS);
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
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('virtual JSON tree supports collapse, expand and keys', async () => {
  const { page, errors } = await openJson('virtual');
  try {
    await page.waitForSelector('.pv-virtual-tree');
    assert.equal(await page.locator('.pv-json-node').count(), 0);
    assert.ok((await page.locator('.pv-vrow').count()) > MIN_VIRTUAL_ROWS);
    await page.getByRole('button', { name: 'Collapse all' }).click();
    await page.waitForFunction(
      (limit) => document.querySelectorAll('.pv-vrow').length < limit,
      COLLAPSED_ROWS,
    );
    await page.getByRole('button', { name: 'Expand all' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.pv-vrow').length > 3);
    assert.match(await page.locator('.pv-virtual-tree').innerText(), /plainview/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('classic XML tree renders without virtual rows', async () => {
  await setSetting(context, TreeModeKey, 'classic');
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  try {
    await page.waitForSelector('.pv-xml');
    assert.equal(await page.locator('.pv-virtual-tree').count(), 0);
    assert.ok((await page.locator('.pv-xml-tag').count()) >= EXPECTED_KEYS);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('virtual XML tree renders windowed rows', async () => {
  await setSetting(context, TreeModeKey, 'virtual');
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  try {
    await page.waitForSelector('.pv-virtual-tree.pv-xml-virtual');
    assert.ok((await page.locator('.pv-vrow').count()) > 0);
    assert.ok((await page.locator('.pv-xml-tag').count()) >= EXPECTED_KEYS);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});
