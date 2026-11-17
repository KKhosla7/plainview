/* global Plainview */
/*
 * Export filename policy.
 */
((root) => {
  function exportFileName(fileName) {
    const name = String(fileName || 'document');
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    return `${base || 'document'}.html`;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { exportFileName });
})(globalThis);
