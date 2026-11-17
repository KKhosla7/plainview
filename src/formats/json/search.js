/* global Plainview */
/*
 * Build a full search index for JSON/YAML/TOML values. The rendered tree is
 * deliberately capped for large files, but search must still cover the whole
 * document.
 */
((root) => {
  const MaxEntries = 200_000;

  function build(rootValue) {
    const entries = [];
    const stack = new WeakSet();

    function walk(value, path) {
      if (entries.length >= MaxEntries) {
        return;
      }

      const pathText = Plainview.jsonPath.pathToJsonPath(path);
      entries.push({
        key: path.at(-1),
        path,
        pathText,
        value,
        isRoot: path.length === 0,
      });

      if (value === null || Plainview.valueKind(value) !== 'object' || stack.has(value)) {
        return;
      }

      stack.add(value);
      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
          walk(value[index], [...path, index]);
        }
      } else {
        for (const [key, child] of Object.entries(value)) {
          walk(child, [...path, key]);
        }
      }
      stack.delete(value);
    }

    walk(rootValue, []);
    return entries;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonSearch: { build, MaxEntries },
  });
})(globalThis);
