import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runCheck } from '@kkhosla7/dwarpal-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const config = path.join(project, 'ast-slop.config.mjs');
const ratchetPath = path.join(project, 'ast-ratchet.json');
const ratchet = JSON.parse(fs.readFileSync(ratchetPath, 'utf8'));

function evaluate(report) {
  if (report.complete !== true) {
    console.error(`AST checker incomplete: ${report.skippedChecks.join(', ')}`);
    return 2;
  }

  const count = report.summary?.count;
  if (!Number.isInteger(count)) {
    console.error('AST checker did not return a diagnostic count.');
    return 2;
  }

  if (count > ratchet.maxDiagnostics) {
    console.error(`AST ratchet failed: ${count} diagnostics, maximum ${ratchet.maxDiagnostics}.`);
    return 1;
  }

  console.log(`AST ratchet passed: ${count} diagnostics, maximum ${ratchet.maxDiagnostics}.`);
  if (count < ratchet.maxDiagnostics) {
    console.log(`Lower ast-ratchet.json to ${count} to lock in the improvement.`);
  }

  return 0;
}

if (ratchet.maxDiagnostics === 0) {
  console.error('A zero baseline must use the hard gate: npm run ast:check.');
  process.exitCode = 2;
} else {
  const { report } = await runCheck({ root: project, configPath: config });
  process.exitCode = evaluate(report);
}
