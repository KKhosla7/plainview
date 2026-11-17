/* global Plainview */
(() => {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function showError(title, message, target) {
    document.documentElement.setAttribute('data-pv', 'error');
    const wrap = el('main', 'pv-viewer-error');
    wrap.append(el('h1', '', title), el('p', '', message));
    if (target) {
      const link = el('a', 'pv-viewer-link', 'Download the original file');
      link.href = target;
      wrap.append(link);
    }
    document.body.replaceChildren(wrap);
  }

  function extensionOf(value) {
    const [path] = String(value || '').split(/[?#]/u);
    const last = path.split(/[\\/]/u).pop() || '';
    const dot = last.lastIndexOf('.');
    return dot < 0 ? '' : last.slice(dot + 1).toLowerCase();
  }

  function payloadStore() {
    return (
      globalThis.chrome?.storage?.session ??
      globalThis.browser?.storage?.session ??
      globalThis.chrome?.storage?.local ??
      globalThis.browser?.storage?.local
    );
  }

  async function readPayload(key) {
    const area = payloadStore();
    if (!area) {
      return null;
    }

    const data = await area.get(key);
    await area.remove(key);
    return data?.[key] ?? null;
  }

  async function mountPayload(key, params) {
    const payload = await readPayload(key);
    if (!payload) {
      showError('Could not open this download', 'The downloaded content is no longer available.');
      return;
    }

    const fileName = String(payload.name || params.get('name') || 'Document');
    const format = Plainview.detectFormat(String(payload.type || ''), fileName);
    if (!format) {
      showError(
        'Unsupported file type',
        `${extensionOf(fileName) || 'This file'} is not supported.`,
      );
      return;
    }

    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';
    document.documentElement.setAttribute('data-pv-version', version);
    document.documentElement.setAttribute('data-pv', 'pending');
    document.title = fileName;
    await Plainview.mountViewer({
      source: String(payload.text ?? ''),
      url: '',
      format,
      fileName,
    });
  }

  async function mountFromPayloadParams(params) {
    const key = params.get('payload');
    if (!key) {
      return false;
    }

    await mountPayload(key, params);
    return true;
  }

  function detectDocumentFormat(contentType, fallbackName, pathname) {
    let format = Plainview.detectFormat(contentType, pathname);
    if (!format) {
      format = Plainview.detectFormat('', fallbackName);
    }

    if (!format) {
      format = Plainview.detectFormat('', pathname);
    }

    return format;
  }

  async function main() {
    const params = new URLSearchParams(location.search);
    if (await mountFromPayloadParams(params)) {
      return;
    }

    const target = params.get('url');
    if (!target) {
      showError('No file to open', 'The viewer was opened without a file URL.');
      return;
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      showError('Invalid file URL', target);
      return;
    }

    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
      showError('Unsupported URL', 'Plainview can only open HTTP, HTTPS and file URLs.');
      return;
    }

    const fallbackName = params.get('name') || parsed.pathname.split('/').pop() || 'Document';
    let response;
    try {
      response = await Plainview.requestResponse(target, {
        cache: 'no-store',
        credentials: 'include',
      });
    } catch (error) {
      showError(
        'Could not read this file',
        error instanceof Error ? error.message : String(error),
        target,
      );
      return;
    }

    if (!response.ok) {
      showError('Could not read this file', `The server returned HTTP ${response.status}.`, target);
      return;
    }

    const source = await response.text();
    const contentType = response.headers.get('content-type') || params.get('type') || '';
    const format = detectDocumentFormat(contentType, fallbackName, parsed.pathname);
    if (!format) {
      showError(
        'Unsupported file type',
        `${extensionOf(fallbackName) || 'This file'} is not a format Plainview renders.`,
        target,
      );
      return;
    }

    const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
    const version = runtime?.getManifest?.().version || 'dev';
    document.documentElement.setAttribute('data-pv-version', version);
    document.documentElement.setAttribute('data-pv', 'pending');
    document.title = fallbackName;
    await Plainview.mountViewer({
      source,
      url: target,
      format,
      fileName: fallbackName,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
})();
