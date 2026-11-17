import { spawnSync } from 'node:child_process';
import fs, { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const LocalOrigin = 'http://127.0.0.1';
const project = path.resolve(here, '..');
const fixtures = path.join(project, 'store', 'fixtures');
const dist = path.join(project, 'dist', 'chrome');
const docsDir = path.join(project, 'docs', 'screenshots');
const storeDir = path.join(project, 'store', 'screenshots');
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
  const file = path.join(fixtures, new URL(request.url, LocalOrigin).pathname.replace(/^\//u, ''));
  if (!(file.startsWith(fixtures) && fs.existsSync(file))) {
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
const base = `${LocalOrigin}:${server.address().port}`;

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
  deviceScaleFactor: 2,
});

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });

function resize(source, target) {
  const result = spawnSync('magick', [source, '-resize', '1280x800', target], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`could not resize ${source}`);
  }
}

async function capture(name, route, setup) {
  const page = await context.newPage();
  await page.goto(`${base}/${route}`);
  await page.waitForSelector('.pv-app');
  await page.waitForTimeout(700);
  if (setup) {
    await setup(page);
  }
  await page.waitForTimeout(450);
  const docsPath = path.join(docsDir, `${name}.png`);
  await page.screenshot({ path: docsPath });
  await page.close();
  console.log('wrote', path.relative(project, docsPath));
  return docsPath;
}

async function instantScrollTo(page, selector) {
  await page.evaluate((target) => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ block: 'start' });
    }
    root.style.scrollBehavior = previous;
  }, selector);
  await page.waitForTimeout(250);
}

function writeScreenshotAssets() {
  for (const name of ['markdown-light', 'markdown-mermaid', 'markdown-source', 'json', 'xml']) {
    resize(path.join(docsDir, `${name}.png`), path.join(storeDir, `${name}.png`));
    console.log('wrote', path.relative(project, path.join(storeDir, `${name}.png`)));
  }

  const webp = spawnSync(
    'magick',
    [
      '-delay',
      '220',
      '-loop',
      '0',
      path.join(docsDir, 'markdown-light.png'),
      path.join(docsDir, 'markdown-mermaid.png'),
      path.join(docsDir, 'markdown-dark.png'),
      path.join(docsDir, 'markdown-source.png'),
      path.join(docsDir, 'json.png'),
      path.join(docsDir, 'xml.png'),
      '-resize',
      '1280x800',
      '-quality',
      '86',
      path.join(project, 'docs', 'demo.webp'),
    ],
    { stdio: 'inherit' },
  );
  if (webp.status !== 0) {
    throw new Error('could not create demo.webp');
  }
  console.log('wrote docs/demo.webp');
}

const docs = {};
try {
  docs.markdownLight = await capture('markdown-light', 'showcase.md', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });
  docs.markdownDark = await capture('markdown-dark', 'showcase.md', async (page) => {
    await page.getByRole('button', { name: 'Dark theme' }).click();
  });
  docs.markdownMermaid = await capture('markdown-mermaid', 'showcase.md', async (page) => {
    await page.getByRole('button', { name: 'Dark theme' }).click();
    await page.waitForSelector('.pv-mermaid-ready svg', { timeout: 20_000 });
    await instantScrollTo(page, '#the-dusk-sequence');
  });
  docs.markdownSource = await capture('markdown-source', 'showcase.md', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
    await page.getByRole('tab', { name: 'Source' }).click();
  });
  docs.json = await capture('json', 'showcase.json', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });
  docs.xml = await capture('xml', 'showcase.xml', async (page) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
  });

  writeScreenshotAssets();
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
  server.close();
}
