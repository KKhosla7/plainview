import fs from 'node:fs';
import path from 'node:path';

function ensureDirectories(target) {
  for (const directory of [
    'src/core',
    'src/fonts',
    'src/options',
    'src/styles',
    'assets',
    'vendor/mermaid/chunks/mermaid.esm.min',
    'vendor/yaml',
    'vendor/toml',
    'vendor/jmespath',
    'vendor/highlight',
    'vendor/katex/fonts',
  ]) {
    fs.mkdirSync(path.join(target, directory), { recursive: true });
  }
}

function copyRuntimeFiles({ project }, target) {
  fs.copyFileSync(
    path.join(project, 'src', 'background.js'),
    path.join(target, 'src', 'background.js'),
  );

  for (const runtimeFile of [
    'fonts.js',
    'events.js',
    'setting-keys.js',
    'value.js',
    'shortcut-config.js',
  ]) {
    fs.copyFileSync(
      path.join(project, 'src', 'core', runtimeFile),
      path.join(target, 'src', 'core', runtimeFile),
    );
  }

  for (const directory of ['options', 'fonts']) {
    fs.cpSync(path.join(project, 'src', directory), path.join(target, 'src', directory), {
      recursive: true,
    });
  }
  fs.copyFileSync(
    path.join(project, 'src', 'styles', 'design-tokens.css'),
    path.join(target, 'src', 'styles', 'design-tokens.css'),
  );
  fs.cpSync(path.join(project, 'assets'), path.join(target, 'assets'), { recursive: true });
}

function copyPackageFiles({ project, bundleDir }, target) {
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    const source = path.join(project, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(target, file));
    }
  }

  for (const file of [
    'boot.js',
    'app.js',
    'export-chrome.js',
    'export-data.js',
    'xml-worker.js',
    'styles.css',
  ]) {
    fs.copyFileSync(path.join(bundleDir, file), path.join(target, file));
  }
}

function copyLicenseFile({ project }, targetFile, packageName) {
  for (const licenseName of ['LICENSE.md', 'LICENSE']) {
    const source = path.join(project, 'node_modules', packageName, licenseName);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, targetFile);
      return;
    }
  }
}

function copyLicenses({ project, mermaidMain }, target) {
  copyLicenseFile({ project }, path.join(target, 'vendor', 'marked.LICENSE'), 'marked');
  fs.copyFileSync(mermaidMain, path.join(target, 'vendor', 'mermaid', 'mermaid.esm.min.mjs'));
  copyLicenseFile({ project }, path.join(target, 'vendor', 'yaml', 'LICENSE'), 'js-yaml');
  copyLicenseFile({ project }, path.join(target, 'vendor', 'toml', 'LICENSE'), 'smol-toml');
  copyLicenseFile({ project }, path.join(target, 'vendor', 'jmespath', 'LICENSE'), 'jmespath');
  copyLicenseFile({ project }, path.join(target, 'vendor', 'highlight', 'LICENSE'), 'highlight.js');
  copyLicenseFile({ project }, path.join(target, 'vendor', 'katex', 'LICENSE'), 'katex');
  copyLicenseFile({ project }, path.join(target, 'vendor', 'mermaid', 'LICENSE'), 'mermaid');
}

function copyVendorBundles({ bundleDir, vendorBundles }, target) {
  for (const vendor of vendorBundles) {
    fs.copyFileSync(
      path.join(bundleDir, vendor.name, vendor.output),
      path.join(target, vendor.target),
    );
  }
}

function copyKatex({ katexCss, katexExportCss, katexFonts, katexFontFiles }, target) {
  fs.writeFileSync(path.join(target, 'vendor', 'katex', 'katex.min.css'), katexCss);
  fs.writeFileSync(path.join(target, 'vendor', 'katex', 'katex-export.css'), katexExportCss);
  for (const name of katexFontFiles) {
    fs.copyFileSync(
      path.join(katexFonts, name),
      path.join(target, 'vendor', 'katex', 'fonts', name),
    );
  }
}

function copyMermaidChunks(context, target) {
  const { project, chunkFiles, fail } = context;
  for (const name of chunkFiles) {
    const source = fs.readFileSync(
      path.join(project, 'node_modules', 'mermaid', 'dist', 'chunks', 'mermaid.esm.min', name),
      'utf8',
    );
    const patched = source
      .replaceAll('Function("return this")()', 'globalThis')
      .replace(/\(0,eval\)\([A-Za-z_$][\w$]*\)/gu, 'void 0');
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
}

export function copyCommon(context, target) {
  ensureDirectories(target);
  copyRuntimeFiles(context, target);
  copyPackageFiles(context, target);
  copyVendorBundles(context, target);
  copyLicenses(context, target);
  copyKatex(context, target);
  copyMermaidChunks(context, target);
}
