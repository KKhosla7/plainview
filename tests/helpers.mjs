import fs, { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import urls from '../src/core/urls.json' with { type: 'json' };

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(project, 'tests', 'fixtures');
const LocalOrigin = urls.localOrigin;
const dist = path.join(project, 'dist', 'chrome');

function valueKind(value) {
  if (value === null) {
    return 'null';
  }

  return typeof value;
}

const MIME = {
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonc': 'text/plain; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
  '.ndjson': 'text/plain; charset=utf-8',

  '.yaml': 'text/plain; charset=utf-8',
  '.toml': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8',
  '.tsv': 'text/plain; charset=utf-8',
  '.xml': 'text/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

export function fixtureUrl(name) {
  return pathToFileURL(path.join(fixtures, name)).href;
}

export async function startServer(overrides = {}) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, LocalOrigin).pathname);
    const file = path.join(fixtures, pathname.replace(/^\//u, ''));

    if (!(file.startsWith(fixtures) && fs.existsSync(file))) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    const override = overrides[pathname];
    let body = fs.readFileSync(file);
    let contentType = MIME[path.extname(file)] || 'application/octet-stream';
    let headers = {};
    if (typeof override === 'function') {
      const value = override();
      if (value && valueKind(value) === 'object' && 'body' in value) {
        body = Buffer.isBuffer(value.body) ? value.body : Buffer.from(String(value.body));
        contentType = value.type || contentType;
        headers = value.headers || {};
      } else if (value !== undefined) {
        body = Buffer.from(String(value));
      }
    } else if (valueKind(override) === 'string') {
      contentType = override;
    }

    response.writeHead(200, { 'content-type': contentType, ...headers });
    response.end(body);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `${LocalOrigin}:${server.address().port}`;
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

export async function setSetting(context, key, value) {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 10_000 })];
  }
  await workers[0].evaluate(
    ({ settingKey, settingValue }) => chrome.storage.local.set({ [settingKey]: settingValue }),
    { settingKey: key, settingValue: value },
  );
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
  if (errors.length > 0) {
    throw new Error(`Browser errors:\n${errors.join('\n')}`);
  }
}
