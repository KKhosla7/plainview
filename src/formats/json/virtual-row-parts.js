import { el } from '../../core/dom.js';
import { actionButton } from './virtual-parts.js';

function appendGuides(node, row, guideBase, indentStep, guideStep) {
  for (let depth = 0; depth < row.depth; depth += 1) {
    const guide = el('span', 'pv-guide');
    guide.style.left = `${guideBase + depth * indentStep}px`;
    guide.style.color = `var(--pv-guide-${(depth % guideStep) + 1})`;
    node.append(guide);
  }
}

function appendToggle(node, state, row, toggleRow) {
  const toggle = actionButton('pv-vrow-toggle', row.expanded ? '▾' : '▸');
  toggle.setAttribute('aria-expanded', String(row.expanded));
  toggle.setAttribute('aria-label', row.expanded ? 'Collapse' : 'Expand');
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleRow(state, row);
  });
  node.append(toggle);
  node.addEventListener('click', (event) => {
    if (event.target.closest('.pv-json-path')) {
      return;
    }
    toggleRow(state, row);
  });
}

export { appendGuides, appendToggle };
