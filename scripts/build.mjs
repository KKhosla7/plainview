import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

import { copyCommon } from './build-copy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const dist = path.join(project, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
const sourceManifest = JSON.parse(
  fs.readFileSync(path.join(project, 'src', 'manifest.json'), 'utf8'),
);
const [HttpMatchPattern, HttpsMatchPattern] = sourceManifest.host_permissions;

const STYLE_FILES = [
  'src/styles/design-tokens.css',
  'src/styles/tokens.css',
  'src/styles/topbar.css',
  'src/styles/export-menu.css',
  'src/styles/layout.css',
  'src/styles/layout-overlays.css',
  'src/styles/data.css',
  'src/styles/data-tools.css',
  'src/styles/data-search.css',
  'src/styles/data-csv.css',
  'src/styles/trees.css',
  'src/styles/mermaid.css',
  'src/styles/source.css',
  'src/styles/code-highlight.css',
  'src/styles/responsive.css',
  'src/styles/theme-html.css',
  'src/styles/theme-html-doc.css',
  'src/styles/theme-html-doc-code.css',
  'src/styles/table-borders.css',
  'src/styles/table-layout.css',
  'src/styles/virtual-tree.css',
];

const mermaidDist = path.join(project, 'node_modules', 'mermaid', 'dist');
const mermaidMain = path.join(mermaidDist, 'mermaid.esm.min.mjs');
const mermaidChunks = path.join(mermaidDist, 'chunks', 'mermaid.esm.min');
const katexDist = path.join(project, 'node_modules', 'katex', 'dist');
const katexFonts = path.join(katexDist, 'fonts');

const vendorBundles = [
  {
    name: 'yaml',
    contents: `export { DEFAULT_SCHEMA, dump, loadAll } from 'js-yaml';`,
    output: 'yaml.min.mjs',
    target: 'vendor/yaml/js-yaml.min.mjs',
  },
  {
    name: 'jmespath',
    contents: `export { search } from 'jmespath';`,
    output: 'jmespath.min.mjs',
    target: 'vendor/jmespath/jmespath.min.mjs',
  },
  {
    name: 'toml',
    contents: `export { parse, stringify } from 'smol-toml';`,
    output: 'toml.min.mjs',
    target: 'vendor/toml/toml.min.mjs',
  },
  {
    name: 'highlight',
    contents: `export { default } from 'highlight.js/lib/common';`,
    output: 'highlight.min.mjs',
    target: 'vendor/highlight/highlight.min.mjs',
  },
  {
    name: 'katex',
    contents: `export { default as katex } from 'katex';\nexport { default as renderMathInElement } from 'katex/contrib/auto-render';`,
    output: 'katex.min.mjs',
    target: 'vendor/katex/katex.min.mjs',
  },
];

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

for (const required of [
  path.join(project, 'src', 'app-entry.js'),
  path.join(project, 'src', 'boot-entry.js'),
  path.join(project, 'src', 'export-chrome-entry.js'),
  path.join(project, 'src', 'export-data-entry.js'),
  path.join(katexDist, 'katex.min.css'),
  katexFonts,
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
const katexFontFiles = fs
  .readdirSync(katexFonts)
  .filter((name) => name.endsWith('.woff2'))
  .sort();

if (chunkFiles.length === 0) {
  fail('no mermaid ESM chunks found');
}

if (katexFontFiles.length === 0) {
  fail('no KaTeX woff2 fonts found');
}

const rawKatexCss = fs.readFileSync(path.join(katexDist, 'katex.min.css'), 'utf8');
const katexCss = rawKatexCss.replace(
  /,url\(fonts\/[^)]+\.woff\) format\("woff"\),url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/gu,
  '',
);
if (/\.woff\)|\.ttf\)/u.test(katexCss)) {
  fail('could not trim non-woff2 KaTeX font sources');
}
const katexExportCss = katexCss.replace(/url\(fonts\/([^)]+\.woff2)\)/gu, (_match, name) => {
  const data = fs.readFileSync(path.join(katexFonts, name));
  return `url(data:font/woff2;base64,${data.toString('base64')})`;
});

const css = (
  await transform(
    STYLE_FILES.map((file) => fs.readFileSync(path.join(project, file), 'utf8')).join('\n'),
    { loader: 'css', minify: true, target: ['chrome120', 'firefox142'] },
  )
).code;

const bundleDir = path.join(dist, '.bundle');
fs.mkdirSync(bundleDir, { recursive: true });

const CssModule = path.join(bundleDir, 'viewer-css.js');
fs.writeFileSync(CssModule, `globalThis.PLAINVIEW_CSS = ${JSON.stringify(css)};\n`);

const BuildOptions = {
  bundle: true,
  minify: true,
  legalComments: 'none',
  target: ['chrome120', 'firefox142'],
  logLevel: 'silent',
};
const pageBuild = {
  loader: { '.html': 'text', '.txt': 'text' },
  alias: { 'virtual:viewer-css': CssModule },
};

function bundle(entry, output, format, extra = {}) {
  return build({
    ...BuildOptions,
    entryPoints: [path.join(project, 'src', entry)],
    format,
    outfile: path.join(bundleDir, output),
    ...extra,
  });
}

await bundle('boot-entry.js', 'boot.js', 'iife');
await bundle('app-entry.js', 'app.js', 'esm', pageBuild);
await bundle('export-chrome-entry.js', 'export-chrome.js', 'iife');
await bundle('export-data-entry.js', 'export-data.js', 'iife', pageBuild);
await bundle('formats/xml/parse-worker.js', 'xml-worker.js', 'iife');

await Promise.all(
  vendorBundles.map((vendor) =>
    build({
      stdin: {
        contents: vendor.contents,
        resolveDir: project,
        sourcefile: `${vendor.name}-vendor.js`,
        loader: 'js',
      },
      bundle: true,
      format: 'esm',
      minify: true,
      legalComments: 'none',
      target: ['chrome120', 'firefox142'],
      outfile: path.join(bundleDir, vendor.name, vendor.output),
      logLevel: 'silent',
    }),
  ),
);

fs.writeFileSync(path.join(bundleDir, 'styles.css'), css);

function manifestFor(browser) {
  const manifest = structuredClone(sourceManifest);
  manifest.version = pkg.version;
  manifest.content_scripts[0].js = ['boot.js'];
  manifest.content_scripts[0].css = ['styles.css'];
  manifest.web_accessible_resources = [
    {
      resources: [
        'app.js',
        'export-chrome.js',
        'export-data.js',
        'xml-worker.js',
        'vendor/mermaid/mermaid.esm.min.mjs',
        'vendor/yaml/js-yaml.min.mjs',
        'vendor/toml/toml.min.mjs',
        'vendor/jmespath/jmespath.min.mjs',
        'vendor/highlight/highlight.min.mjs',
        'vendor/katex/katex.min.mjs',
        'vendor/katex/katex.min.css',
        'vendor/katex/katex-export.css',
        ...katexFontFiles.map((name) => `vendor/katex/fonts/${name}`),
        ...chunkFiles.map((name) => `vendor/mermaid/chunks/mermaid.esm.min/${name}`),
        ...fontFiles.map((name) => `src/fonts/${name}`),
      ],
      matches: [HttpMatchPattern, HttpsMatchPattern, 'file:///*'],
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
  copyCommon(
    {
      project,
      bundleDir,
      vendorBundles,
      mermaidMain,
      katexCss,
      katexExportCss,
      katexFonts,
      katexFontFiles,
      chunkFiles,
      fail,
    },
    target,
  );
  fs.writeFileSync(
    path.join(target, 'manifest.json'),
    `${JSON.stringify(manifestFor(browser), null, 2)}\n`,
  );
}

fs.rmSync(bundleDir, { recursive: true, force: true });

const BYTES_PER_KILOBYTE = 1024;
const size = (file) => `${(fs.statSync(file).size / BYTES_PER_KILOBYTE).toFixed(1)} KB`;
console.log(
  `built dist/chrome and dist/firefox (v${pkg.version}) · boot ${size(path.join(dist, 'chrome', 'boot.js'))} · app ${size(path.join(dist, 'chrome', 'app.js'))} · css ${size(path.join(dist, 'chrome', 'styles.css'))} · ${chunkFiles.length} mermaid chunks`,
);
console.log(
  `lazy vendors · yaml ${size(path.join(dist, 'chrome', 'vendor', 'yaml', 'js-yaml.min.mjs'))} · highlight ${size(path.join(dist, 'chrome', 'vendor', 'highlight', 'highlight.min.mjs'))} · katex ${size(path.join(dist, 'chrome', 'vendor', 'katex', 'katex.min.mjs'))} js + ${size(path.join(dist, 'chrome', 'vendor', 'katex', 'katex.min.css'))} css + ${(katexFontFiles.reduce((total, name) => total + fs.statSync(path.join(katexFonts, name)).size, 0) / BYTES_PER_KILOBYTE).toFixed(1)} KB fonts · export css ${size(path.join(dist, 'chrome', 'vendor', 'katex', 'katex-export.css'))}`,
);
