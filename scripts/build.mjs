import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import process from 'node:process';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const dist = path.join(project, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
const sourceManifest = JSON.parse(
  fs.readFileSync(path.join(project, 'src', 'manifest.json'), 'utf8'),
);

const STYLE_FILES = [
  'src/styles/tokens.css',
  'src/styles/topbar.css',
  'src/styles/layout.css',
  'src/styles/data.css',
  'src/styles/trees.css',
  'src/styles/mermaid.css',
  'src/styles/source.css',
  'src/styles/responsive.css',
  'src/styles/theme-html.css',
  'src/styles/theme-html-doc.css',
];

const mermaidDist = path.join(project, 'node_modules', 'mermaid', 'dist');
const mermaidMain = path.join(mermaidDist, 'mermaid.esm.min.mjs');
const mermaidChunks = path.join(mermaidDist, 'chunks', 'mermaid.esm.min');

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

for (const required of [
  path.join(project, 'src', 'app-entry.js'),
  path.join(project, 'src', 'boot-entry.js'),
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

const chunkFiles = fs
  .readdirSync(mermaidChunks)
  .filter((name) => name.endsWith('.mjs'))
  .sort();
const fontFiles = fs
  .readdirSync(path.join(project, 'src', 'fonts'))
  .filter((name) => name.endsWith('.woff2'))
  .sort();

if (chunkFiles.length === 0) {
  fail('no mermaid ESM chunks found');
}

const css = (
  await transform(
    STYLE_FILES.map((file) => fs.readFileSync(path.join(project, file), 'utf8')).join('\n'),
    { loader: 'css', minify: true, target: ['chrome120', 'firefox142'] },
  )
).code;

const bundleDir = path.join(dist, '.bundle');
fs.mkdirSync(bundleDir, { recursive: true });

// esbuild filters are Go regexes; they must not carry the JavaScript unicode flag.
// biome-ignore lint/style/useUnicodeRegex: esbuild filters reject the unicode flag
const ViewerCssFilter = /^virtual:viewer-css$/;
// biome-ignore lint/style/useUnicodeRegex: esbuild filters reject the unicode flag
const AllFilter = /.*/;

const cssPlugin = {
  name: 'viewer-css',
  setup(buildApi) {
    buildApi.onResolve({ filter: ViewerCssFilter }, () => ({
      path: 'viewer-css',
      namespace: 'viewer',
    }));
    buildApi.onLoad({ filter: AllFilter, namespace: 'viewer' }, () => ({
      contents: `globalThis.PLAINVIEW_CSS = ${JSON.stringify(css)};`,
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: [path.join(project, 'src', 'boot-entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  legalComments: 'none',
  target: ['chrome120', 'firefox142'],
  outfile: path.join(bundleDir, 'boot.js'),
  logLevel: 'silent',
});

await build({
  entryPoints: [path.join(project, 'src', 'app-entry.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  target: ['chrome120', 'firefox142'],
  outfile: path.join(bundleDir, 'app.js'),
  plugins: [cssPlugin],
  logLevel: 'silent',
});

fs.writeFileSync(path.join(bundleDir, 'styles.css'), css);

function copyCommon(target) {
  fs.mkdirSync(path.join(target, 'src', 'core'), { recursive: true });
  fs.mkdirSync(path.join(target, 'src', 'fonts'), { recursive: true });
  fs.mkdirSync(path.join(target, 'src', 'options'), { recursive: true });
  fs.mkdirSync(path.join(target, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(target, 'vendor', 'mermaid', 'chunks', 'mermaid.esm.min'), {
    recursive: true,
  });

  // Only runtime files are shipped; the rest is bundled into boot.js/app.js.
  fs.copyFileSync(
    path.join(project, 'src', 'background.js'),
    path.join(target, 'src', 'background.js'),
  );
  fs.copyFileSync(
    path.join(project, 'src', 'core', 'fonts.js'),
    path.join(target, 'src', 'core', 'fonts.js'),
  );
  fs.cpSync(path.join(project, 'src', 'options'), path.join(target, 'src', 'options'), {
    recursive: true,
  });
  fs.cpSync(path.join(project, 'src', 'fonts'), path.join(target, 'src', 'fonts'), {
    recursive: true,
  });
  fs.cpSync(path.join(project, 'assets'), path.join(target, 'assets'), {
    recursive: true,
  });

  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    const source = path.join(project, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(target, file));
    }
  }

  fs.copyFileSync(path.join(bundleDir, 'boot.js'), path.join(target, 'boot.js'));
  fs.copyFileSync(path.join(bundleDir, 'app.js'), path.join(target, 'app.js'));
  fs.copyFileSync(path.join(bundleDir, 'styles.css'), path.join(target, 'styles.css'));

  for (const licenseName of ['LICENSE.md', 'LICENSE']) {
    const markedLicense = path.join(project, 'node_modules', 'marked', licenseName);
    if (fs.existsSync(markedLicense)) {
      fs.copyFileSync(markedLicense, path.join(target, 'vendor', 'marked.LICENSE'));
      break;
    }
  }

  fs.copyFileSync(mermaidMain, path.join(target, 'vendor', 'mermaid', 'mermaid.esm.min.mjs'));

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
      path.join(target, 'vendor', 'mermaid', 'chunks', 'mermaid.esm.min', name),
      patched,
    );
  }

  const mermaidLicense = path.join(project, 'node_modules', 'mermaid', 'LICENSE');
  if (fs.existsSync(mermaidLicense)) {
    fs.copyFileSync(mermaidLicense, path.join(target, 'vendor', 'mermaid', 'LICENSE'));
  }
}

function manifestFor(browser) {
  const manifest = structuredClone(sourceManifest);
  manifest.version = pkg.version;
  manifest.content_scripts[0].js = ['boot.js'];
  manifest.content_scripts[0].css = ['styles.css'];
  manifest.web_accessible_resources = [
    {
      resources: [
        'app.js',
        'vendor/mermaid/mermaid.esm.min.mjs',
        ...chunkFiles.map((name) => `vendor/mermaid/chunks/mermaid.esm.min/${name}`),
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
        id: 'plainview@kk18888678.github.io',
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

fs.rmSync(bundleDir, { recursive: true, force: true });

const size = (file) => `${(fs.statSync(file).size / 1024).toFixed(1)} KB`;
console.log(
  `built dist/chrome and dist/firefox (v${pkg.version}) · boot ${size(path.join(dist, 'chrome', 'boot.js'))} · app ${size(path.join(dist, 'chrome', 'app.js'))} · css ${size(path.join(dist, 'chrome', 'styles.css'))} · ${chunkFiles.length} mermaid chunks`,
);
