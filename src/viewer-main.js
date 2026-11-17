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

  async function main() {
    const params = new URLSearchParams(location.search);
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
    let format = Plainview.detectFormat(contentType, parsed.pathname);
    if (!format) {
      format = Plainview.detectFormat('', fallbackName);
    }

    if (!format) {
      format = Plainview.detectFormat('', parsed.pathname);
    }

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
