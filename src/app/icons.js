import { createElement } from '../core/dom.js';

/*
 * Inline SVG icons used by the reader chrome.
 */
const Namespace = 'http://www.w3.org/2000/svg';

function icon(paths, size = 18) {
  const svg = document.createElementNS(Namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('pv-icon');
  for (const d of paths) {
    const path = document.createElementNS(Namespace, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }

  return svg;
}

function createIconButton(className, label, iconNode) {
  const button = createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(iconNode);
  return button;
}

export const icons = {
  data: () =>
    icon([
      'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1',
      'M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
    ]),
  export: () => icon(['M12 15V3', 'm7 8 5-5 5 5', 'M5 21h14']),
  html: () => icon(['m8 8-4 4 4 4', 'm16 8 4 4-4 4', 'm14 4-4 16']),
  table: () => icon(['M3 3h18v18H3z', 'M3 9h18', 'M3 15h18', 'M9 3v18', 'M15 3v18']),
  source: () =>
    icon([
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'm9 13-2 2 2 2',
      'm15 13 2 2-2 2',
    ]),
  theme: () =>
    icon([
      'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
      'M12 3l0 18',
      'M12 9l4.65 -4.65',
      'M12 14.3l7.37 -7.37',
      'M12 19.6l8.85 -8.85',
    ]),
};

export { createIconButton };
