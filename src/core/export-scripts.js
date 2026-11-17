/* global Plainview */
/*
 * Standalone-export browser scripts, kept separate from HTML assembly.
 */

import dataExportScript from './export/data-export.txt';
import tableBordersScript from './export/table-borders.txt';
import tableResizeScript from './export/table-resize.txt';
import themeScript from './export/theme.txt';
import tocScript from './export/toc.txt';
import topScript from './export/top.txt';

((root) => {
  root.Plainview = Object.assign(root.Plainview || {}, {
    exportScripts: {
      ThemeScript: themeScript,
      TopScript: topScript,
      DataExportScript: dataExportScript,
      TableBordersScript: tableBordersScript,
      TableResizeScript: tableResizeScript,
      TocScript: tocScript,
    },
  });
})(globalThis);
