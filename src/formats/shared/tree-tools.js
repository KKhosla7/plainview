function openAncestors(entry) {
  let { node } = entry;
  while (node) {
    if (node.tagName === 'DETAILS') {
      node.open = true;
    }
    node = node.parentElement?.closest('details');
  }

  if (entry.node.tagName === 'DETAILS') {
    entry.node.open = true;
  }
}

export { openAncestors };
