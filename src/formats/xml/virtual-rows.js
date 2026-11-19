import { el } from '../../core/dom.js';
import { Cdata, closeTag, openTag, pathButton } from './tree-shared.js';

function nodeParts(fragment) {
  return [...fragment.childNodes];
}

function rowParts(descriptor) {
  if (descriptor.kind === 'container') {
    return [
      ...nodeParts(openTag(descriptor.source)),
      el('span', 'pv-xml-count', `${descriptor.childCount ?? descriptor.children.length} nodes`),
    ];
  }

  if (descriptor.kind === 'empty') {
    return nodeParts(openTag(descriptor.source, true));
  }

  if (descriptor.kind === 'text') {
    const parts = nodeParts(openTag(descriptor.source));
    for (const child of descriptor.textChildren) {
      parts.push(
        child.nodeType === Cdata
          ? el('span', 'pv-xml-cdata', `<![CDATA[${child.nodeValue}]]>`)
          : el('span', 'pv-xml-text', child.nodeValue.trim()),
      );
    }
    parts.push(...nodeParts(closeTag(descriptor.source)));
    return parts;
  }

  if (descriptor.kind === 'textNode') {
    return [el('span', 'pv-xml-text', descriptor.source.nodeValue.trim())];
  }

  if (descriptor.kind === 'cdata') {
    return [el('span', 'pv-xml-cdata', `<![CDATA[${descriptor.source.nodeValue}]]>`)];
  }

  if (descriptor.kind === 'comment') {
    return [el('span', 'pv-xml-comment', `\x3C!--${descriptor.source.nodeValue}-->`)];
  }

  if (descriptor.kind === 'pi') {
    const { source } = descriptor;
    return [
      el(
        'span',
        'pv-xml-pi',
        `<?${source.nodeName}${source.nodeValue ? ` ${source.nodeValue}` : ''}?>`,
      ),
    ];
  }

  return [];
}

function createRow(state, descriptor, index) {
  const row = el('div', 'pv-vrow');
  row.style.top = `${index * 24}px`;
  row.style.paddingLeft = `${8 + descriptor.depth * 18}px`;
  for (const className of descriptor.classes) {
    row.classList.add(className);
  }

  if (descriptor.kind === 'container') {
    const toggle = el('button', 'pv-vrow-toggle', descriptor.expanded ? '▾' : '▸');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(descriptor.expanded));
    toggle.setAttribute('aria-label', descriptor.expanded ? 'Collapse' : 'Expand');
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      descriptor.expanded = !descriptor.expanded;
      descriptor.ensureChildren?.();
      state.rebuild();
    });
    row.append(toggle);
    row.addEventListener('click', (event) => {
      if (event.target.closest('.pv-xml-path')) {
        return;
      }
      descriptor.expanded = !descriptor.expanded;
      descriptor.ensureChildren?.();
      state.rebuild();
    });
  } else {
    row.append(el('span', 'pv-vrow-spacer', ''));
  }

  row.append(...rowParts(descriptor));
  if (
    descriptor.kind !== 'textNode' &&
    descriptor.kind !== 'cdata' &&
    descriptor.kind !== 'comment' &&
    descriptor.kind !== 'pi'
  ) {
    row.append(pathButton(descriptor.source, state.rootElement));
  }

  if (!descriptor.container) {
    const text = row.textContent;
    if (text.length > 60) {
      row.title = text;
    }
  }
  descriptor.row = row;
  return row;
}

export { createRow };
