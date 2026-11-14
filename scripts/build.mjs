import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const dist = path.join(project, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
const sourceManifest = JSON.parse(
  fs.readFileSync(path.join(project, 'src', 'manifest.json'), 'utf8'),
);

const markedDist = path.join(
  project,
  'node_modules',
  'marked',
  'lib',
  'marked.umd.js',
);
const mermaidDist = path.join(project, 'node_modules', 'mermaid', 'dist');
const mermaidMain = path.join(mermaidDist, 'mermaid.esm.min.mjs');
const mermaidChunks = path.join(mermaidDist, 'chunks', 'mermaid.esm.min');

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

for (const required of [
  markedDist,
  mermaidMain,
  mermaidChunks,
  path.join(project, 'assets', 'icon-16.png'),
  path.join(project, 'assets', 'icon-128.png'),
]) {
  if (!fs.existsSync(required)) {
    fail(`missing ${required} — run npm install first`);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const cssFiles = sourceManifest.content_scripts[0].css;
const css = cssFiles
  .map((file) => fs.readFileSync(path.join(project, file), 'utf8'))
  .join('\n');

const chunkFiles = fs
  .readdirSync(mermaidChunks)
  .filter((name) => name.endsWith('.mjs'))
  .sort();

const fontFiles = fs
  .readdirSync(path.join(project, 'src', 'fonts'))
  .filter((name) => name.endsWith('.woff2'))
  .sort();

if (chunkFiles.length === 0) fail('no mermaid ESM chunks found');

function copyCommon(target) {
  fs.mkdirSync(path.join(target, 'src'), { recursive: true });
  fs.mkdirSync(path.join(target, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(target, 'vendor', 'mermaid', 'chunks', 'mermaid.esm.min'), {
    recursive: true,
  });

  fs.cpSync(path.join(project, 'src'), path.join(target, 'src'), {
    recursive: true,
    filter(source) {
      return path.basename(source) !== 'manifest.json';
    },
  });

  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    const source = path.join(project, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(target, file));
    }
  }

  for (const file of fs.readdirSync(path.join(project, 'assets'))) {
    fs.copyFileSync(
      path.join(project, 'assets', file),
      path.join(target, 'assets', file),
    );
  }

  fs.copyFileSync(markedDist, path.join(target, 'vendor', 'marked.umd.js'));
  for (const licenseName of ['LICENSE.md', 'LICENSE']) {
    const markedLicense = path.join(
      project,
      'node_modules',
      'marked',
      licenseName,
    );
    if (fs.existsSync(markedLicense)) {
      fs.copyFileSync(
        markedLicense,
        path.join(target, 'vendor', 'marked.LICENSE'),
      );
      break;
    }
  }

  fs.writeFileSync(
    path.join(target, 'vendor', 'viewer-css.js'),
    `globalThis.PLAINVIEW_CSS = ${JSON.stringify(css)};\n`,
  );

  fs.copyFileSync(
    mermaidMain,
    path.join(target, 'vendor', 'mermaid', 'mermaid.esm.min.mjs'),
  );

  for (const name of chunkFiles) {
    const source = fs.readFileSync(path.join(mermaidChunks, name), 'utf8');
    const patched = source
      .replaceAll('Function("return this")()', 'globalThis')
      .replaceAll('(0,eval)(r)', 'void 0');
    if (patched.includes('Function("return this")()')) {
      fail(`could not patch Firefox CSP workaround in ${name}`);
    }
    if (patched.includes('(0,eval)(')) {
      fail(`could not patch Firefox eval workaround in ${name}`);
    }
    fs.writeFileSync(
      path.join(
        target,
        'vendor',
        'mermaid',
        'chunks',
        'mermaid.esm.min',
        name,
      ),
      patched,
    );
  }

  const mermaidLicense = path.join(project, 'node_modules', 'mermaid', 'LICENSE');
  if (fs.existsSync(mermaidLicense)) {
    fs.copyFileSync(
      mermaidLicense,
      path.join(target, 'vendor', 'mermaid', 'LICENSE'),
    );
  }
}

function manifestFor(browser) {
  const manifest = structuredClone(sourceManifest);
  manifest.version = pkg.version;
  manifest.web_accessible_resources = [
    {
      resources: [
        'vendor/mermaid/mermaid.esm.min.mjs',
        ...chunkFiles.map(
          (name) => `vendor/mermaid/chunks/mermaid.esm.min/${name}`,
        ),
        ...fontFiles.map((name) => `src/fonts/${name}`),
      ],
      matches: ['http://*/*', 'https://*/*', 'file:///*'],
    },
  ];

  if (browser === 'chrome') {
    manifest.background = { service_worker: 'src/background.js' };
  } else {
    manifest.background = { scripts: ['src/background.js'] };
  }

  if (browser === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'plainview@random-tools.local',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    };
  }

  return manifest;
}

for (const browser of ['chrome', 'firefox']) {
  const target = path.join(dist, browser);
  fs.mkdirSync(target, { recursive: true });
  copyCommon(target);
  fs.writeFileSync(
    path.join(target, 'manifest.json'),
    `${JSON.stringify(manifestFor(browser), null, 2)}\n`,
  );
}

console.log(
  `built dist/chrome and dist/firefox (v${pkg.version}, ${chunkFiles.length} mermaid chunks)`,
);
