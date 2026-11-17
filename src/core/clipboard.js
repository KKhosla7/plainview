/* global Plainview */
((root) => {
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { copyText });
})(globalThis);
