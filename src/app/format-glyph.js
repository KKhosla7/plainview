/* global Plainview */
const Glyphs = Object.freeze({
  CSV: ',',
  HTML: '</>',
  JSON: '{}',
  MD: '#',
  TOML: '[=]',
  TSV: '⇥',
  XML: '<>',
  YAML: '-:',
});

function formatGlyph(formatLabel) {
  return Glyphs[formatLabel] || '{}';
}

export { formatGlyph };
