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

function resolveDocument() {
  if (document.documentElement?.getAttribute?.('data-pv')) {
    return null;
  }

  if (!(document.body || isRawTextDocument())) {
    return null;
  }

  const format = detectFormat(document.contentType, decodeUriComponentSafe(location.pathname));
  if (!(format && isRawTextDocument())) {
    return null;
  }

  return { format, source: extractSource(format) };
}

function loadingName() {
  try {
    const last = new URL(location.href).pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'document';
  } catch {
    return 'document';
  }
}

function showLoading(format) {
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
  const timer = globalThis.setTimeout(() => {
    if (!document.querySelector('.pv-app')) {
      document.body?.append(overlay);
    }
  }, LOADING_DELAY_MS);
  return () => {
    globalThis.clearTimeout(timer);
    overlay.remove();
  };
}

async function mountDocument(format, source) {
  const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
  const version = runtime?.getManifest?.().version || 'dev';

  document.documentElement.setAttribute('data-pv-version', version);
  document.documentElement.setAttribute('data-pv', 'pending');
  document.documentElement.setAttribute('aria-busy', 'true');
  if (format.id === 'xml') {
    ensureHtmlShellForXml();
  }
  const clearLoading = showLoading(format);

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

  const documentData = resolveDocument();
  if (!documentData) {
    return;
  }

  await mountDocument(documentData.format, documentData.source);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
