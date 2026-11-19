import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const workerPath = path.join(here, 'test-runner-worker.mjs');

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

async function runTest(index) {
  if (index >= tests.length) {
    return;
  }
  const code = await new Promise((resolve) => {
    const worker = new Worker(workerPath, {
      workerData: { path: tests[index] },
      stdout: true,
      stderr: true,
    });
    worker.stdout.pipe(process.stdout);
    worker.stderr.pipe(process.stderr);
    worker.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
    worker.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  process.exitCode = Math.max(process.exitCode ?? 0, code);
  await runTest(index + 1);
}

await runTest(0);
