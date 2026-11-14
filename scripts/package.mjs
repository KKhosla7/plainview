import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const dist = path.join(project, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));

function zip(source, output) {
  fs.rmSync(output, { force: true });
  const result = spawnSync('zip', ['-qr', output, '.'], {
    cwd: source,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`packaged ${path.relative(project, output)}`);
}

for (const browser of ['chrome', 'firefox']) {
  const source = path.join(dist, browser);
  if (!fs.existsSync(path.join(source, 'manifest.json'))) {
    console.error(`missing ${source}/manifest.json — run npm run build first`);
    process.exit(1);
  }
  zip(source, path.join(dist, `plainview-${browser}-${pkg.version}.zip`));
}

const sourceZip = path.join(dist, `plainview-${pkg.version}-source.zip`);
fs.rmSync(sourceZip, { force: true });
const archive = spawnSync(
  'git',
  ['archive', '--format=zip', `--prefix=plainview-${pkg.version}/`, 'HEAD', '-o', sourceZip],
  { cwd: project, stdio: 'inherit' },
);
if (archive.status !== 0) {
  process.exit(archive.status ?? 1);
}
console.log(`packaged ${path.relative(project, sourceZip)}`);
