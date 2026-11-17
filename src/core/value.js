/* global Plainview */
/*
 * The one runtime type boundary for dynamic document values. Callers branch on
 * a small string kind instead of repeating typeof checks across format code.
 */
((root) => {
  function valueKind(value) {
    if (value === null) {
      return 'null';
    }

    return typeof value;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { valueKind });
})(globalThis);
