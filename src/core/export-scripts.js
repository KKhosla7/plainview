/* global Plainview */
/*
 * Standalone-export browser scripts, kept separate from HTML assembly.
 */
import themeScript from './export/theme.txt';
import tocScript from './export/toc.txt';
import topScript from './export/top.txt';

((root) => {
  root.Plainview = Object.assign(root.Plainview || {}, {
    exportScripts: {
      ThemeScript: themeScript,
      TopScript: topScript,
      TocScript: tocScript,
    },
  });
})(globalThis);
