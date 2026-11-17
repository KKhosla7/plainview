/* global Plainview */
((root) => {
  function applyTableBorders(on) {
    root.document.documentElement.dataset.pvTableBorders = on ? 'on' : 'off';
  }

  function createTableBordersToggle({ button }) {
    const documentRoot = root.document.documentElement;

    function apply() {
      const on = documentRoot.dataset.pvTableBorders === 'on';
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Hide column lines' : 'Show column lines');
      button.title = on ? 'Hide column lines' : 'Show column lines';
    }

    button.addEventListener('click', () => {
      applyTableBorders(documentRoot.dataset.pvTableBorders !== 'on');
      apply();
    });
    apply();
    return { apply };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createTableBordersToggle,
    tableBorders: { apply: applyTableBorders },
  });
})(globalThis);
