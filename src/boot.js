import { extractSource, isRawTextDocument } from './core/document.js';
import { detectFormat } from './core/formats.js';
import { ensureHtmlShellForXml } from './core/xml-shell.js';

const LOADING_DELAY_MS = 120;

function decodeUriComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function documentFormat() {
  const state = document.documentElement?.getAttribute?.('data-pv');
  if (state && state !== 'pending') {
    return null;
  }

  if (!(document.body || isRawTextDocument())) {
    return null;
  }

  const format = detectFormat(document.contentType, decodeUriComponentSafe(location.pathname));
  return format && isRawTextDocument() ? format : null;
}

function resolveDocument(format) {
  return format ? { format, source: extractSource(format) } : null;
}

function nextPaint() {
  return new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => globalThis.setTimeout(resolve));
  });
}

function loadingName() {
  try {
    const last = new URL(location.href).pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'document';
  } catch {
    return 'document';
  }
}

function showLoading(format, immediate = false) {
  const overlay = document.createElement('div');
  overlay.className = 'pv-loading';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  const card = document.createElement('div');
  card.className = 'pv-loading-card';
  const spinner = document.createElement('span');
  spinner.className = 'pv-loading-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const title = document.createElement('span');
  title.className = 'pv-loading-title';
  title.textContent = loadingName();
  const detail = document.createElement('span');
  detail.className = 'pv-loading-detail';
  detail.textContent = `Opening ${format.name}…`;
  card.append(spinner, title, detail);
  overlay.append(card);
  let timer = 0;
  const attach = () => {
    if (!document.querySelector('.pv-app')) {
      document.body?.append(overlay);
    }
  };
  if (immediate) {
    attach();
  } else {
    timer = globalThis.setTimeout(attach, LOADING_DELAY_MS);
  }

  return () => {
    globalThis.clearTimeout(timer);
    overlay.remove();
  };
}

async function mountDocument(format, source, activeLoading = null) {
  const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
  const version = runtime?.getManifest?.().version || 'dev';

  if (format.id === 'xml') {
    ensureHtmlShellForXml();
  }
  document.documentElement.setAttribute('data-pv-version', version);
  document.documentElement.setAttribute('data-pv', 'pending');
  document.documentElement.setAttribute('aria-busy', 'true');
  const clearLoading = activeLoading || showLoading(format);

  try {
    const { mountViewer } = await import(runtime.getURL('app.js'));
    if (!document.body) {
      return;
    }
    await mountViewer({
      source,
      url: location.href,
      format,
    });
  } catch (error) {
    document.documentElement.setAttribute(
      'data-pv-error',
      String(error instanceof Error ? error.message : error),
    );
  } finally {
    clearLoading();
    document.documentElement.removeAttribute('aria-busy');
  }
}

async function main() {
  if (globalThis.__plainviewLoaded) {
    return;
  }
  globalThis.__plainviewLoaded = true;

  const format = documentFormat();
  if (!format) {
    return;
  }

  let activeLoading = null;
  if (format.id === 'xml') {
    activeLoading = showLoading(format, true);
    await nextPaint();
  }

  const documentData = resolveDocument(format);
  if (!documentData) {
    activeLoading?.();
    document.documentElement.removeAttribute('data-pv');
    return;
  }

  await mountDocument(documentData.format, documentData.source, activeLoading);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
