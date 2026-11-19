import fs, { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import gifenc from 'gifenc';
import sharp from 'sharp';
import urls from '../src/core/urls.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
const LocalOrigin = urls.localOrigin;
const project = path.resolve(here, '..');
const fixtures = path.join(project, 'store', 'fixtures');
const dist = path.join(project, 'dist', 'chrome');
const docsDir = path.join(project, 'docs', 'screenshots');
const storeDir = path.join(project, 'store', 'screenshots');
const NOT_FOUND = 404;
const OK = 200;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;
const CAPTURE_SETTLE_MS = 700;
const CAPTURE_FINAL_MS = 450;
const SCROLL_SETTLE_MS = 250;
const WEBP_QUALITY = 86;
const WEBP_ANIMATION_DELAY_MS = 220;
const PALETTE_SIZE = 256;
const MERMAID_TIMEOUT_MS = 20_000;
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
    response.writeHead(NOT_FOUND);
    response.end('not found');
    return;
  }
  response.writeHead(OK, {
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
  viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  deviceScaleFactor: 2,
});

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });

async function resize(source, target) {
  await sharp(source).resize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT).toFile(target);
}

async function setTheme(page, theme) {
  const button = page.getByRole('button', { name: 'Toggle theme' });
  const dark = (await button.getAttribute('aria-pressed')) === 'true';
  if (dark !== (theme === 'dark')) {
    await button.click();
  }
}

async function capture(name, route, setup) {
  const page = await context.newPage();
  await page.goto(`${base}/${route}`);
  await page.waitForSelector('.pv-app');
  await page.waitForTimeout(CAPTURE_SETTLE_MS);
  if (setup) {
    await setup(page);
  }
  await page.waitForTimeout(CAPTURE_FINAL_MS);
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
  await page.waitForTimeout(SCROLL_SETTLE_MS);
}

async function writeScreenshotAssets() {
  await Promise.all(
    ['markdown-light', 'markdown-mermaid', 'markdown-source', 'json', 'xml'].map((name) =>
      resize(path.join(docsDir, `${name}.png`), path.join(storeDir, `${name}.png`)),
    ),
  );
  for (const name of ['markdown-light', 'markdown-mermaid', 'markdown-source', 'json', 'xml']) {
    console.log('wrote', path.relative(project, path.join(storeDir, `${name}.png`)));
  }

  const { applyPalette, GIFEncoder, quantize } = gifenc;
  const encoder = GIFEncoder();
  const frames = await Promise.all(
    ['markdown-light', 'markdown-mermaid', 'markdown-dark', 'markdown-source', 'json', 'xml'].map(
      (name) =>
        sharp(path.join(docsDir, `${name}.png`))
          .resize(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
    ),
  );
  for (const { data, info } of frames) {
    const palette = quantize(data, PALETTE_SIZE);
    encoder.writeFrame(applyPalette(data, palette), info.width, info.height, {
      delay: WEBP_ANIMATION_DELAY_MS,
      palette,
    });
  }
  encoder.finish();
  await sharp(Buffer.from(encoder.bytes()), { animated: true })
    .webp({ loop: 0, quality: WEBP_QUALITY })
    .toFile(path.join(project, 'docs', 'demo.webp'));
  console.log('wrote docs/demo.webp');
}

const docs = {};
try {
  docs.markdownLight = await capture('markdown-light', 'showcase.md', async (page) => {
    await setTheme(page, 'light');
  });
  docs.markdownDark = await capture('markdown-dark', 'showcase.md', async (page) => {
    await setTheme(page, 'dark');
  });
  docs.markdownMermaid = await capture('markdown-mermaid', 'showcase.md', async (page) => {
    await setTheme(page, 'dark');
    await page.waitForSelector('.pv-mermaid-ready svg', { timeout: MERMAID_TIMEOUT_MS });
    await instantScrollTo(page, '#the-dusk-sequence');
  });
  docs.markdownSource = await capture('markdown-source', 'showcase.md', async (page) => {
    await setTheme(page, 'light');
    await page.getByRole('tab', { name: 'Source' }).click();
  });
  docs.json = await capture('json', 'showcase.json', async (page) => {
    await setTheme(page, 'light');
  });
  docs.xml = await capture('xml', 'showcase.xml', async (page) => {
    await setTheme(page, 'light');
  });

  await writeScreenshotAssets();
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
  server.close();
}
