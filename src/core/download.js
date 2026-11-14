/* global Plainview */
(function (root) {
  'use strict';

  const MIME = {
    markdown: 'text/markdown;charset=utf-8',
    json: 'application/json;charset=utf-8',
    xml: 'application/xml;charset=utf-8',
  };

  function downloadText(source, fileName, format) {
    const type = MIME[format.id] || 'text/plain;charset=utf-8';
    const blob = new Blob([source], { type });
    const url = URL.createObjectURL(blob);
    const link = Plainview.createElement('a');
    link.href = url;
    link.download =
      fileName || `document.${format.extensions?.[0] || 'txt'}`;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  root.Plainview = Object.assign(root.Plainview || {}, { downloadText });
})(globalThis);
