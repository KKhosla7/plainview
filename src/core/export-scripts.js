/* global Plainview */
/*
 * Standalone-export browser scripts, kept separate from HTML assembly.
 */

import tocScript from './export/toc.txt';

((root) => {
  root.Plainview = Object.assign(root.Plainview || {}, {
    exportScripts: {
      TocScript: tocScript,
    },
  });
})(globalThis);
