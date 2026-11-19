import path from 'node:path';
import process from 'node:process';
import { runCheck } from '@kkhosla7/dwarpal-core';

const COUNT_WIDTH = 4;
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
process.exitCode = summary.count === 0 ? 0 : 1;
