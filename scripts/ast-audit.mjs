import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runCheck } from '@kkhosla7/dwarpal-core';

const COUNT_WIDTH = 4;
const gate = process.argv.includes('--gate');
const baseline = gate
  ? JSON.parse(fs.readFileSync(new URL('../ast-full-ratchet.json', import.meta.url), 'utf8'))
  : null;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const result = await runCheck({ root, configPath: path.join(root, 'ast-audit.config.mjs') });
const { complete, diagnostics, skippedChecks, summary } = result.report;
if (complete !== true) {
  console.error(`AST audit incomplete: ${skippedChecks.join(', ')}`);
  process.exit(2);
}

const counts = new Map();
for (const diagnostic of diagnostics) {
  counts.set(diagnostic.rule, (counts.get(diagnostic.rule) ?? 0) + 1);
}

for (const [rule, count] of [...counts].sort((left, right) => right[1] - left[1])) {
  console.log(`${String(count).padStart(COUNT_WIDTH)} ${rule}`);
}
console.log(`${String(summary.count).padStart(COUNT_WIDTH)} total`);
if (gate) {
  if (summary.count > baseline.maxDiagnostics) {
    console.error(
      `AST full ratchet failed: ${summary.count} diagnostics, maximum ${baseline.maxDiagnostics}.`,
    );
    process.exitCode = 1;
  } else if (summary.count < baseline.maxDiagnostics) {
    console.error(
      `AST full ratchet passed at ${summary.count}; lower ast-full-ratchet.json to ${summary.count}.`,
    );
    process.exitCode = 0;
  } else {
    console.log(`AST full ratchet passed: ${summary.count} diagnostics.`);
    process.exitCode = 0;
  }
} else {
  process.exitCode = summary.count === 0 ? 0 : 1;
}
