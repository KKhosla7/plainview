/* global Plainview */
((root) => {
  const CopyResetMs = 1200;

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function metaButton(label) {
    const button = el('button', 'pv-meta-button', label);
    button.type = 'button';
    return button;
  }

  function createDataToolbar({ article, source, summary, copyLabel, treeMode }) {
    const meta = el('div', 'pv-doc-meta');
    const text = el('span', 'pv-meta-text', summary);
    const actions = el('span', 'pv-meta-actions');

    const expand = metaButton('Expand all');
    expand.addEventListener('click', () => {
      const virtualTree = article.querySelector('.pv-virtual-tree');
      if (virtualTree) {
        virtualTree.dispatchEvent(new CustomEvent('pv-expand-all'));
        return;
      }

      for (const details of article.querySelectorAll('details')) {
        details.open = true;
      }
    });

    const collapse = metaButton('Collapse all');
    collapse.addEventListener('click', () => {
      const virtualTree = article.querySelector('.pv-virtual-tree');
      if (virtualTree) {
        virtualTree.dispatchEvent(new CustomEvent('pv-collapse-all'));
        return;
      }

      for (const details of article.querySelectorAll('details')) {
        details.open = false;
      }
    });

    const copy = metaButton(copyLabel);
    Plainview.onAsync(copy, 'click', async () => {
      const ok = await Plainview.copyText(source);
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      globalThis.setTimeout(() => {
        copy.textContent = copyLabel;
      }, CopyResetMs);
    });

    actions.append(expand, collapse);
    if (treeMode) {
      const mode = metaButton(treeMode === 'virtual' ? 'Classic tree' : 'Virtual tree');
      mode.title = treeMode === 'virtual' ? 'Use the paged tree' : 'Use the virtualized tree';
      mode.addEventListener('click', () => {
        Plainview.saveSetting(
          Plainview.JSON_TREE_MODE_KEY,
          treeMode === 'virtual' ? 'classic' : 'virtual',
        );
        location.reload();
      });
      actions.append(mode);
    }
    actions.append(copy);
    meta.append(text, actions);
    return meta;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createDataToolbar });
})(globalThis);
