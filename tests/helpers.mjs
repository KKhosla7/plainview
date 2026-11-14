import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(project, 'tests', 'fixtures');
const dist = path.join(project, 'dist', 'chrome');

const MIME = {
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonc': 'text/plain; charset=utf-8',
  '.xml': 'text/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

export function fixtureUrl(name) {
  return pathToFileURL(path.join(fixtures, name)).href;
}

export async function startServer(overrides = {}) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path.join(fixtures, pathname.replace(/^\//u, ''));

    if (!(file.startsWith(fixtures) && fs.existsSync(file))) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    response.writeHead(200, {
      'content-type': overrides[pathname] || MIME[path.extname(file)] || 'application/octet-stream',
    });
    response.end(fs.readFileSync(file));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

export async function launchExtension() {
  const profile = mkdtempSync(path.join(tmpdir(), 'plainview-test-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      '--disable-extensions-file-access-check',
      '--allow-file-access-from-files',
    ],
  });
  return { context, profile };
}

export async function closeExtension({ context, profile } = {}) {
  if (context) {
    await context.close();
  }
  if (profile) {
    rmSync(profile, { recursive: true, force: true });
  }
}

export async function openPage(context, url) {
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }
    const text = message.text();
    if (text.includes('Failed to load resource')) {
      return;
    }
    if (text.includes('net::ERR_')) {
      return;
    }
    errors.push(text);
  });

  await page.goto(url);
  return { page, errors };
}

export function assertNoErrors(errors) {
  // biome-ignore lint/suspicious/noMisplacedAssertion: shared assertion helper called from tests
  assert.deepEqual(errors, []);
}
