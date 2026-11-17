/* global Plainview */
/*
 * Small tree-node presentation helpers shared by the JSON tree renderer.
 */
((root) => {
  const { el } = Plainview;

  function span(className, text) {
    return el('span', className, text);
  }

  function actionButton(className, label) {
    const node = el('button', className, label);
    node.type = 'button';
    return node;
  }

  function valueClass(value) {
    if (value === null) {
      return 'pv-json-null';
    }

    if (Plainview.valueKind(value) === 'string') {
      return 'pv-json-string';
    }

    if (Plainview.valueKind(value) === 'number') {
      return 'pv-json-number';
    }

    if (Plainview.valueKind(value) === 'boolean') {
      return 'pv-json-boolean';
    }

    return 'pv-json-boolean';
  }

  function renderValue(value) {
    if (Plainview.valueKind(value) === 'string') {
      return JSON.stringify(value);
    }

    if (value === null) {
      return 'null';
    }

    return String(value);
  }

  function renderKey(key) {
    if (Plainview.valueKind(key) === 'number') {
      return span('pv-json-index', String(key));
    }

    return span('pv-json-key', JSON.stringify(key));
  }

  function keyIndex(state, segment) {
    if (state.array) {
      return Number(segment);
    }

    return state.keys.indexOf(String(segment));
  }

  function pathButton(pathText) {
    const node = el('button', 'pv-json-path', '⧉');
    node.type = 'button';
    node.title = `Copy path ${pathText}`;
    node.setAttribute('aria-label', `Copy path ${pathText}`);
    node.setAttribute('data-json-path', pathText);
    return node;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonTreeShared: {
      actionButton,
      keyIndex,
      pathButton,
      renderKey,
      renderValue,
      span,
      valueClass,
    },
  });
})(globalThis);
