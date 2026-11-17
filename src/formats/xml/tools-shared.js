/* global Plainview */
/*
 * Shared XML tool state and hit navigation.
 */
((root) => {
  const { el } = Plainview;
  const CopyResetMs = 1200;
  const SearchDebounceMs = 120;
  const Element = 1;
  const Attribute = 2;
  const Document = 9;

  function button(className, label) {
    const node = el('button', className, label);
    node.type = 'button';
    return node;
  }

  function searchText(node) {
    if (node.nodeType === Element) {
      const attrs = [...node.attributes].map((attr) => `${attr.name}=${attr.value}`).join(' ');
      return `${node.nodeName} ${attrs}`;
    }

    if (node.nodeType === Attribute) {
      return `${node.name}=${node.value}`;
    }

    return node.nodeValue || '';
  }

  function mark(entry, className) {
    entry.node.classList.add(className);
    if (entry.summary) {
      entry.summary.classList.add(className);
    }
  }

  function unmark(entry, className) {
    entry.node.classList.remove(className);
    if (entry.summary) {
      entry.summary.classList.remove(className);
    }
  }

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

  function reveal(entry) {
    openAncestors(entry);
    requestAnimationFrame(() => {
      entry.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function selectHit(hits, nextIndex, activeClass) {
    for (const hit of hits) {
      unmark(hit, activeClass);
    }

    if (hits.length === 0) {
      return -1;
    }
    const wrapped = (nextIndex + hits.length) % hits.length;
    const entry = hits[wrapped];
    mark(entry, activeClass);
    reveal(entry);
    return wrapped;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    xmlToolsShared: {
      CopyResetMs,
      SearchDebounceMs,
      Attribute,
      Document,
      button,
      el,
      mark,
      searchText,
      selectHit,
      unmark,
    },
  });
})(globalThis);
