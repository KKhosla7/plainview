import { createElement } from './dom.js';

function cloneSelection(sourceRoot, selection) {
  if (!selection) {
    return null;
  }

  const range =
    typeof selection.getRangeAt === 'function' ? selection.getRangeAt(0).cloneRange() : selection;
  if (range.collapsed || !sourceRoot.contains(range.commonAncestorContainer)) {
    return null;
  }

  const clone = createElement('div');
  clone.className = sourceRoot.className;
  clone.append(range.cloneContents());
  return clone;
}

export { cloneSelection };
