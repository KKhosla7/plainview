/* global Plainview */
/* Shared state creation for the virtualized JSON tree. */
((root) => {
  const AutoRows = 20_000;
  const { openDepth } = Plainview.jsonLimits;

  function createState({ value, options, indexRef, onStats, tree }) {
    return {
      activePath: '',
      autoRows: 0,
      expanded: new Set(['$']),
      frame: 0,
      indexRef,
      onStats,
      pageDepth: options.openDepth ?? openDepth(options.source.length),
      rows: [],
      rowElements: new Map(),
      stats: { arrays: 0, depth: 0, nodes: 0, objects: 0, truncated: false, values: 0 },
      tree,
      value,
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonVirtualState: { AutoRows, createState },
  });
})(globalThis);
