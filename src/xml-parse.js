/* global MDView */
(function (root) {
  'use strict';

  function parseXml(source) {
    const clean = source.replace(/^\uFEFF/, '');
    const doc = new DOMParser().parseFromString(clean, 'application/xml');
    const error =
      doc.querySelector('parsererror') ||
      (doc.documentElement?.localName === 'parsererror'
        ? doc.documentElement
        : null);

    if (error) {
      const message = (error.textContent || 'Malformed XML').trim();
      const lineColumn =
        /line\s+(\d+)\s+at\s+column\s+(\d+)/i.exec(message) ||
        /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
      return {
        error: {
          message,
          line: lineColumn ? Number(lineColumn[1]) : undefined,
          column: lineColumn ? Number(lineColumn[2]) : undefined,
        },
      };
    }

    if (!doc.documentElement) {
      return { error: { message: 'The document has no root element.' } };
    }

    return { doc };
  }

  root.MDView = Object.assign(root.MDView || {}, { parseXml });
})(globalThis);
