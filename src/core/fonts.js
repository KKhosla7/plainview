/* global Plainview */
/*
 * Local font faces, registered through the CSS Font Loading API. This keeps
 * the extension self-contained (no Google Fonts request) and avoids relative
 * URL problems when the reader is mounted inside an XML document.
 */
((root) => {
  const Faces = [
    ['Barlow Condensed', 'barlow-condensed-500.woff2', '500', 'normal'],
    ['Barlow Condensed', 'barlow-condensed-600.woff2', '600', 'normal'],
    ['Barlow Condensed', 'barlow-condensed-700.woff2', '700', 'normal'],
    ['IBM Plex Mono', 'ibm-plex-mono-400.woff2', '400', 'normal'],
    ['IBM Plex Mono', 'ibm-plex-mono-500.woff2', '500', 'normal'],
    ['IBM Plex Sans', 'ibm-plex-sans-400-italic.woff2', '400', 'italic'],
    ['IBM Plex Sans', 'ibm-plex-sans-400.woff2', '400', 'normal'],
    ['IBM Plex Sans', 'ibm-plex-sans-500.woff2', '500', 'normal'],
    ['IBM Plex Sans', 'ibm-plex-sans-600.woff2', '600', 'normal'],
  ];

  let installed = false;

  function installFonts() {
    if (installed) {
      return;
    }
    installed = true;

    const runtime = root.browser?.runtime ?? root.chrome?.runtime;
    if (!(runtime && document.fonts) || typeof root.FontFace !== 'function') {
      return;
    }

    for (const [family, file, weight, style] of Faces) {
      try {
        const face = new FontFace(family, `url("${runtime.getURL(`src/fonts/${file}`)}")`, {
          weight,
          style,
        });
        document.fonts.add(face);
        face.load().catch(() => undefined);
      } catch {
        /* fallback fonts are fine */
      }
    }
  }

  root.Plainview = Object.assign(root.Plainview || {}, { installFonts });
})(globalThis);
