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

async function exportScope(page, name) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForSelector('.pv-export-menu:not([hidden])');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name }).click(),
  ]);
  return {
    fileName: download.suggestedFilename(),
    text: fs.readFileSync(await download.path(), 'utf8'),
  };
}

it('exports filtered and complete JSON', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  try {
    await page.waitForSelector('.pv-json');
    await page.getByLabel('Search JSON keys and values').fill('label');
    await page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length >= 2);
    const filtered = await exportScope(page, /Download filtered results/u);
    assert.equal(filtered.fileName, 'sample.json');
    assert.deepEqual(JSON.parse(filtered.text), ['one', 'two']);

    const complete = await exportScope(page, /Download complete data/u);
    assert.equal(JSON.parse(complete.text).name, 'plainview');
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('exports filtered CSV rows', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.csv`);
  try {
    await page.waitForSelector('.pv-csv-table');
    await page.getByLabel('Filter CSV rows').fill('beta');
    await page.waitForFunction(
      () => document.querySelectorAll('.pv-csv-table tbody tr').length === 1,
    );
    const filtered = await exportScope(page, /Download filtered results/u);
    assert.equal(filtered.fileName, 'sample.csv');
    assert.match(filtered.text, /^Name,Value,Note/u);
    assert.match(filtered.text, /beta/u);
    assert.doesNotMatch(filtered.text, /alpha/u);

    const complete = await exportScope(page, /Download complete data/u);
    assert.match(complete.text, /alpha/u);
    assert.match(complete.text, /gamma/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('exports complete YAML and TOML data', async () => {
  const yamlPage = await openPage(context, `${base}/sample.yaml`);
  try {
    await yamlPage.page.waitForSelector('.pv-json');
    const yaml = await exportScope(yamlPage.page, /Download complete data/u);
    assert.equal(yaml.fileName, 'sample.yaml');
    assert.match(yaml.text, /name: plainview/u);
    await yamlPage.page.getByLabel('Search JSON keys and values').fill('plainview');
    await yamlPage.page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length > 0);
    const yamlFiltered = await exportScope(yamlPage.page, /Download filtered results/u);
    assert.match(yamlFiltered.text, /plainview/u);
    assertNoErrors(yamlPage.errors);
  } finally {
    await yamlPage.page.close();
  }

  const tomlPage = await openPage(context, `${base}/sample.toml`);
  try {
    await tomlPage.page.waitForSelector('.pv-json');
    const toml = await exportScope(tomlPage.page, /Download complete data/u);
    assert.equal(toml.fileName, 'sample.toml');
    assert.match(toml.text, /title = "Plainview sample"/u);
    assert.match(toml.text, /\[owner\]/u);
    await tomlPage.page.getByLabel('Search JSON keys and values').fill('Plainview');
    await tomlPage.page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length > 0);
    const tomlFiltered = await exportScope(tomlPage.page, /Download filtered results/u);
    assert.match(tomlFiltered.text, /results/u);
    assert.match(tomlFiltered.text, /Plainview/u);
    assertNoErrors(tomlPage.errors);
  } finally {
    await tomlPage.page.close();
  }
});

it('exports complete and filtered XML', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.xml`);
  try {
    await page.waitForSelector('.pv-xml');
    const complete = await exportScope(page, /Download complete data/u);
    assert.equal(complete.fileName, 'sample.xml');
    assert.match(complete.text, /<catalog/u);

    await page.getByLabel('Search XML elements and text').fill('Markdown');
    await page.waitForFunction(() => document.querySelectorAll('.pv-xml-hit').length > 0);
    const filtered = await exportScope(page, /Download filtered results/u);
    assert.match(filtered.text, /<selection>/u);
    assert.match(filtered.text, /<title>Markdown<\/title>/u);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('keeps standalone HTML export in the data export menu', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  try {
    await page.waitForSelector('.pv-json');
    const html = await exportScope(page, /Download HTML page/u);
    assert.equal(html.fileName, 'sample.html');
    assert.match(html.text, /^<!doctype html>/iu);
    assertNoErrors(errors);
  } finally {
    await page.close();
  }
});

it('keeps clean data downloads inside a compressed HTML export', async () => {
  const { page, errors } = await openPage(context, `${base}/sample.json`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plainview-data-export-'));
  try {
    await page.waitForSelector('.pv-json');
    await page.getByLabel('Search JSON keys and values').fill('label');
    await page.waitForFunction(() => document.querySelectorAll('.pv-json-hit').length >= 2);
    const html = await exportScope(page, /Download HTML page/u);
    const file = path.join(dir, 'sample.html');
    fs.writeFileSync(file, html.text);

    const exported = await context.newPage();
    try {
      await exported.goto(pathToFileURL(file).href);
      await exported.waitForSelector('.pv-json');
      await exported.getByRole('button', { name: 'Export data', exact: true }).click();
      await exported.waitForSelector('.pv-export-menu:not([hidden])');
      assert.match(
        await exported.locator('.pv-export-menu').innerText(),
        /Download filtered JSON/u,
      );
      assert.match(
        await exported.locator('.pv-export-menu').innerText(),
        /Download complete JSON/u,
      );
      const [download] = await Promise.all([
        exported.waitForEvent('download'),
        exported.getByRole('button', { name: /Download filtered JSON/u }).click(),
      ]);
      assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(), 'utf8')), ['one', 'two']);
    } finally {
      await exported.close();
    }
    assertNoErrors(errors);
  } finally {
    await page.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
