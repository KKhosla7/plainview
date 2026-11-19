/* global Plainview */
const AssetPath = 'vendor/toml/toml.min.mjs';
let loader = null;

function runtime() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
}

function loadToml() {
  if (!loader) {
    const api = runtime();
    if (!api) {
      throw new Error('extension runtime is unavailable');
    }
    loader = import(api.getURL(AssetPath)).then((module) => {
      if (!module || typeof module.parse !== 'function') {
        throw new Error('TOML parser did not expose parse()');
      }

      return module;
    });
  }

  return loader;
}

export { loadToml };
