/* global Plainview */
((root) => {
  function ignoreSettingError() {
    return false;
  }

  function applyTableBorders(on) {
    root.document.documentElement.dataset.pvTableBorders = on ? 'on' : 'off';
  }

  function createTableBordersButton({ settingKey } = {}) {
    const button = Plainview.createIconButton(
      'pv-action pv-icon-action pv-table-borders-toggle',
      'Show column lines',
      Plainview.icons.table(),
    );
    createTableBordersToggle({ button, settingKey });
    return button;
  }

  function createTableBordersToggle({ button, settingKey }) {
    const documentRoot = root.document.documentElement;
    const SettingKey = settingKey || Plainview.TABLE_BORDERS_KEY;
    let dirty = false;

    function render(on) {
      applyTableBorders(on);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Hide column lines' : 'Show column lines');
      button.title = on ? 'Hide column lines' : 'Show column lines';
    }

    function toggle() {
      dirty = true;
      const on = documentRoot.dataset.pvTableBorders !== 'on';
      render(on);
      Plainview.saveSetting(SettingKey, on);
    }

    button.addEventListener('click', toggle);
    render(documentRoot.dataset.pvTableBorders === 'on');
    Plainview.loadSetting(SettingKey, documentRoot.dataset.pvTableBorders === 'on')
      .then((saved) => {
        if (!dirty) {
          render(Boolean(saved));
        }
      })
      .catch(ignoreSettingError);
    return { apply: render };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    createTableBordersButton,
    createTableBordersToggle,
    tableBorders: { apply: applyTableBorders },
  });
})(globalThis);
