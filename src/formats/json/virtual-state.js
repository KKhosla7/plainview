import { jsonLimits } from '../.././formats/json/limits.js';
import { treeSyntax } from './tree-model.js';

/* Shared state creation for the virtualized JSON tree. */
const AutoRows = 20_000;
const { openDepth } = jsonLimits;

function createState({ value, options, indexRef, onStats, tree }) {
  return {
    activePath: '',
    autoRows: 0,
    expanded: new Set(['$']),
    frame: 0,
    heights: new Map(),
    offsets: [0],
    indexRef,
    onStats,
    pageDepth: options.openDepth ?? openDepth(options.source.length),
    rows: [],
    rowElements: new Map(),
    stats: { arrays: 0, depth: 0, nodes: 0, objects: 0, truncated: false, values: 0 },
    syntax: treeSyntax(options.exportFormatId),
    tree,
    value,
  };
}

export const jsonVirtualState = { AutoRows, createState };
