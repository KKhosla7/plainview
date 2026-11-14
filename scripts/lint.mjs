import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const result = spawnSync(
  'npx',
  ['--no-install', 'biome', 'check', '.', '--reporter=json', '--max-diagnostics=10000'],
  { cwd: project, encoding: 'utf8' },
);

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.error('lint: could not parse Biome output');
  process.exit(1);
}

const diagnostics = report.diagnostics ?? [];
if (diagnostics.length === 0) {
  console.log('Biome: no diagnostics');
  process.exit(0);
}

const bySeverity = {};
const byRule = {};
for (const diagnostic of diagnostics) {
  bySeverity[diagnostic.severity] = (bySeverity[diagnostic.severity] ?? 0) + 1;
  byRule[diagnostic.category] = (byRule[diagnostic.category] ?? 0) + 1;
}
console.error('Biome diagnostics:', bySeverity);
for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
  console.error(`  ${count} ${rule}`);
}
for (const diagnostic of diagnostics.slice(0, 100)) {
  const { location } = diagnostic;
  console.error(
    `${diagnostic.severity.toUpperCase()} ${diagnostic.category} ${location.path}:${location.start.line}:${location.start.column} ${diagnostic.message}`,
  );
}
console.error(`lint: ${diagnostics.length} diagnostics must be fixed or explicitly ignored`);
process.exit(1);
