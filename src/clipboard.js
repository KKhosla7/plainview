/* global MDView */
(function (root) {
  'use strict';

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* permission denied or no secure context */
    }
    return false;
  }

  root.MDView = Object.assign(root.MDView || {}, { copyText });
})(globalThis);
