/* global Plainview */
/*
 * One registry for persisted setting names. The reader, options page and
 * source watcher must all resolve the same keys.
 */
((root) => {
  const AutoReloadKey = 'plainview.autoReloadSource';
  const ExportUncompressedKey = 'plainview.exportUncompressed';
  const ShortcutsKey = 'plainview.shortcuts';
  const TableBordersKey = 'plainview.tableBorders';
  const TableResizeKey = 'plainview.tableResize';
  const TableLayoutKey = 'plainview.tableLayout';
  const ThemeKey = 'plainview.theme';
  const ZoomKey = 'plainview.zoom';
  const Prefix = 'plainview.';
  const LegacyPrefix = 'mdview.';

  root.Plainview = Object.assign(root.Plainview || {}, {
    SETTING_KEYS: Object.freeze({
      AutoReload: AutoReloadKey,
      ExportUncompressed: ExportUncompressedKey,
      Shortcuts: ShortcutsKey,
      TableBorders: TableBordersKey,
      TableResize: TableResizeKey,
      TableLayout: TableLayoutKey,
      Theme: ThemeKey,
      Zoom: ZoomKey,
    }),
    SETTING_PREFIX: Prefix,
    LEGACY_SETTING_PREFIX: LegacyPrefix,
  });
})(globalThis);
