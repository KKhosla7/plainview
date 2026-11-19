import { extractSource, isRawTextDocument } from './core/document.js';
import { detectFormat } from './core/formats.js';
import { ensureHtmlShellForXml } from './core/xml-shell.js';

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

async function mountDocument(format, source) {
  const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
  const version = runtime?.getManifest?.().version || 'dev';

  document.documentElement.setAttribute('data-pv-version', version);
  document.documentElement.setAttribute('data-pv', 'pending');

  try {
    const { mountViewer } = await import(runtime.getURL('app.js'));
    if (format.id === 'xml') {
      ensureHtmlShellForXml();
    }

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
