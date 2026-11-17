import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const checker = path.join(
  project,
  'node_modules',
  '@kkhosla7',
  'dwarpal-core',
  'bin',
  'dwarpal.js',
);
const config = path.join(project, 'ast-slop.config.mjs');
const ratchetPath = path.join(project, 'ast-ratchet.json');
const ratchet = JSON.parse(fs.readFileSync(ratchetPath, 'utf8'));
if (ratchet.maxDiagnostics === 0) {
  console.error('A zero baseline must use the hard gate: npm run ast:check.');
  process.exit(2);
}
const result = spawnSync(
  process.execPath,
  [checker, '--config', config, '--root', project, '--json'],
  {
    cwd: project,
    encoding: 'utf8',
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(2);
}

const count = report.summary?.count;
if (!Number.isInteger(count)) {
  console.error('AST checker did not return a diagnostic count.');
  process.exit(2);
}

if (count > ratchet.maxDiagnostics) {
  console.error(`AST ratchet failed: ${count} diagnostics, maximum ${ratchet.maxDiagnostics}.`);
  process.exit(1);
}

console.log(`AST ratchet passed: ${count} diagnostics, maximum ${ratchet.maxDiagnostics}.`);
if (count < ratchet.maxDiagnostics) {
  console.log(`Lower ast-ratchet.json to ${count} to lock in the improvement.`);
}
