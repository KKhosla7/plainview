import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const dist = path.join(project, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));

function collect(dir, base, files, isExcluded) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (isExcluded(rel)) {
      continue;
    }

    if (entry.isDirectory()) {
      collect(full, base, files, isExcluded);
    } else {
      files[rel] = new Uint8Array(fs.readFileSync(full));
    }
  }
}

function writeZip(source, output, isExcluded) {
  const files = {};
  collect(source, source, files, isExcluded);
  fs.writeFileSync(output, zipSync(files));
  console.log(`packaged ${path.relative(project, output)}`);
}

const excludeNone = () => false;
for (const browser of ['chrome', 'firefox']) {
  const source = path.join(dist, browser);
  if (!fs.existsSync(path.join(source, 'manifest.json'))) {
    console.error(`missing ${source}/manifest.json — run npm run build first`);
    process.exit(1);
  }
  writeZip(source, path.join(dist, `plainview-${browser}-${pkg.version}.zip`), excludeNone);
}

const sourceZip = path.join(dist, `plainview-${pkg.version}-source.zip`);
const excluded = (rel) =>
  /^\.git\//u.test(rel) ||
  /^node_modules\//u.test(rel) ||
  /^dist\//u.test(rel) ||
  /^test-results\//u.test(rel) ||
  /^playwright-report\//u.test(rel) ||
  /\.log$/u.test(rel);
writeZip(project, sourceZip, excluded);
