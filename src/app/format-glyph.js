/* global Plainview */
((root) => {
  const Glyphs = Object.freeze({
    CSV: ',',
    HTML: '</>',
    JSON: '{}',
    JSONL: '≡',
    MD: '#',
    TOML: '[=]',
    TSV: '⇥',
    XML: '<>',
    YAML: '-:',
  });

  function formatGlyph(formatLabel) {
    return Glyphs[formatLabel] || '{}';
  }

  root.Plainview = Object.assign(root.Plainview || {}, { formatGlyph });
})(globalThis);
