import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const fixtures = path.join(project, 'tests', 'fixtures');
const dist = path.join(project, 'dist', 'chrome');
const output = path.join(project, 'store', 'screenshots');
const MIME = {
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'text/xml; charset=utf-8',
};

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const marker = path.resolve(project, '..', '.playwright-browsers');
  if (fs.existsSync(marker)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = fs.readFileSync(marker, 'utf8').trim();
  }
}

const { chromium } = await import('@playwright/test');

const server = http.createServer((request, response) => {
  const file = path.join(
    fixtures,
    new URL(request.url, 'http://127.0.0.1').pathname.replace(/^\//, ''),
  );
  if (!file.startsWith(fixtures) || !fs.existsSync(file)) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[path.extname(file)] || 'application/octet-stream',
  });
  response.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(path.join(tmpdir(), 'plainview-shots-'));
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  channel: 'chromium',
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--disable-extensions-file-access-check',
    '--allow-file-access-from-files',
  ],
  viewport: { width: 1280, height: 800 },
});

fs.mkdirSync(output, { recursive: true });

async function shot(name, route, setup) {
  const page = await context.newPage();
  await page.goto(`${base}/${route}`);
  await page.waitForSelector('.mdv-app');
  await page.waitForTimeout(700);
  if (setup) await setup(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(output, name) });
  await page.close();
  console.log('wrote', name);
}

try {
  await shot('markdown-light.png', 'sample.md', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });
  await shot('markdown-dark.png', 'sample.md', async (page) => {
    await page.getByRole('button', { name: 'Dark theme' }).click();
  });
  await shot('markdown-source.png', 'sample.md', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
    await page.getByRole('tab', { name: 'Source' }).click();
  });
  await shot('json.png', 'sample.json', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });
  await shot('xml.png', 'sample.xml', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
  server.close();
}
