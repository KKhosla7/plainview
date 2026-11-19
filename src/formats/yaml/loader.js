const AssetPath = 'vendor/yaml/js-yaml.min.mjs';
let loader = null;

function runtime() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
}

function loadYaml() {
  if (!loader) {
    const api = runtime();
    if (!api) {
      throw new Error('extension runtime is unavailable');
    }
    loader = import(api.getURL(AssetPath)).then((module) => {
      const yaml = module?.default ?? module;
      if (!yaml || typeof yaml.loadAll !== 'function') {
        throw new Error('YAML parser did not expose loadAll()');
      }

      return yaml;
    });
  }

  return loader;
}

export { loadYaml };
