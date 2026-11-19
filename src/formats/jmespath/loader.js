/* global Plainview */
const AssetPath = 'vendor/jmespath/jmespath.min.mjs';
let loader = null;

function runtime() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
}

function loadJmespath() {
  if (!loader) {
    const api = runtime();
    if (!api) {
      throw new Error('extension runtime is unavailable');
    }
    loader = import(api.getURL(AssetPath)).then((module) => {
      if (!module || typeof module.search !== 'function') {
        throw new Error('JMESPath did not expose search()');
      }

      return module;
    });
  }

  return loader;
}

export { loadJmespath };
