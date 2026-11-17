/* global Plainview */
/*
 * js-yaml is bundled locally and loaded only when a YAML document is opened.
 * The reader never requests a CDN or a remote parser.
 */
((root) => {
  const AssetPath = 'vendor/yaml/js-yaml.min.mjs';
  let loader = null;

  function runtime() {
    return root.browser?.runtime ?? root.chrome?.runtime;
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

  root.Plainview = Object.assign(root.Plainview || {}, { loadYaml });
})(globalThis);
