import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const marker = path.resolve(project, '..', '.playwright-browsers');
  if (fs.existsSync(marker)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = fs.readFileSync(marker, 'utf8').trim();
  }
}

const tests = fs
  .readdirSync(path.join(project, 'tests'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join(project, 'tests', name));

const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...tests], {
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
