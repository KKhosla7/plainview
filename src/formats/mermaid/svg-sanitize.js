function sanitizeSvg(svgText) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  } catch {
    return null;
  }

  if (doc.querySelector('parsererror')) {
    return null;
  }

  const svg = doc.documentElement;
  if (svg?.localName !== 'svg') {
    return null;
  }

  for (const script of svg.querySelectorAll('script')) {
    script.remove();
  }

  for (const node of svg.querySelectorAll('*')) {
    const attrs = node.attributes;
    for (let index = attrs.length - 1; index >= 0; index -= 1) {
      const attr = attrs[index];
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
      } else if (
        (name === 'href' || name.endsWith(':href')) &&
        /^\s*(?:javascript|vbscript|data):/iu.test(attr.value)
      ) {
        node.removeAttribute(attr.name);
      }
    }
  }

  return document.importNode(svg, true);
}

export { sanitizeSvg };
