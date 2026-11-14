/* global Plainview */
/*
 * Format registry. Add an entry here plus a builder in ui.js to teach the
 * viewer another plain-text format.
 */
(function (root) {
  'use strict';

  const FORMATS = {
    markdown: {
      id: 'markdown',
      label: 'MD',
      name: 'Markdown',
      extensions: ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdwn', 'mdx'],
      types: ['text/markdown', 'text/x-markdown'],
    },
    json: {
      id: 'json',
      label: 'JSON',
      name: 'JSON',
      extensions: ['json', 'jsonc', 'geojson', 'jsonld', 'har', 'webmanifest'],
      types: [
        'application/json',
        'text/json',
        'application/ld+json',
        'application/manifest+json',
        'application/geo+json',
      ],
    },
    xml: {
      id: 'xml',
      label: 'XML',
      name: 'XML',
      extensions: [
        'xml',
        'rss',
        'atom',
        'rdf',
        'opml',
        'wsdl',
        'plist',
        'xsl',
        'xslt',
      ],
      types: [
        'application/xml',
        'text/xml',
        'application/rss+xml',
        'application/atom+xml',
        'application/rdf+xml',
        'application/xslt+xml',
        'application/plist+xml',
      ],
    },
  };

  const TEXTUAL_TYPES = new Set(['', 'text/plain', 'application/octet-stream']);
  const SKIP_TYPES = new Set([
    'text/html',
    'application/xhtml+xml',
    'image/svg+xml',
  ]);

  function extensionOf(pathname) {
    const last = pathname.split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    if (dot < 0 || dot === last.length - 1) return '';
    return last.slice(dot + 1).toLowerCase();
  }

  function formatByExtension(extension) {
    for (const format of Object.values(FORMATS)) {
      if (format.extensions.includes(extension)) return format;
    }
    return null;
  }

  function formatByType(contentType) {
    for (const format of Object.values(FORMATS)) {
      if (format.types.includes(contentType)) return format;
    }
    return null;
  }

  function shouldSkip(type, extension) {
    if (SKIP_TYPES.has(type)) return true;
    if (type.startsWith('image/')) return true;
    if (type.startsWith('audio/') || type.startsWith('video/')) return true;
    return extension === 'svg';
  }

  /**
   * Decide which renderer (if any) should handle this document.
   * Returns null for normal HTML pages, images, PDFs, and so on.
   */
  function detectFormat(contentType, pathname) {
    const type = String(contentType || '')
      .toLowerCase()
      .split(';')[0]
      .trim();
    const extension = extensionOf(pathname);

    if (shouldSkip(type, extension)) return null;

    const byType = formatByType(type);
    if (byType) return byType;

    if (TEXTUAL_TYPES.has(type) || !type) {
      return formatByExtension(extension);
    }

    return null;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { detectFormat });
})(globalThis);
