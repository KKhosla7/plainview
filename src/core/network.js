import { valueKind } from '.././core/value.js';

/* global Plainview */
/*
 * The only module allowed to perform raw network I/O. Callers receive a
 * Response or text and decide how to handle failures.
 */
((root) => {
  const AllowedProtocols = new Set([
    'chrome-extension:',
    'file:',
    'http:',
    'https:',
    'moz-extension:',
  ]);

  function requestSource(url, options) {
    const parsed = new URL(url, location.href);
    if (!AllowedProtocols.has(parsed.protocol)) {
      throw new Error(`Plainview cannot request ${parsed.protocol} URLs.`);
    }

    return fetch(parsed.href, options);
  }

  function requestSourceXhr(url) {
    return new Promise((resolve) => {
      try {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onload = () => {
          if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
            resolve(request.responseText);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
        request.send();
      } catch {
        resolve(null);
      }
    });
  }

  async function requestText(url, options) {
    try {
      const response = await requestSource(url, options);
      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch {
      return null;
    }
  }

  async function requestTextExtension(url) {
    const runtime = root.browser?.runtime ?? root.chrome?.runtime;
    if (!runtime?.sendMessage) {
      return null;
    }

    try {
      const response = await runtime.sendMessage({ type: 'plainview:read-source', url });
      return valueKind(response?.text) === 'string' ? response.text : null;
    } catch {
      return null;
    }
  }

  function requestResponse(url, options) {
    return requestSource(url, options);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    requestResponse,
    requestText,
    requestTextExtension,
    requestTextXhr: requestSourceXhr,
  });
})(globalThis);
