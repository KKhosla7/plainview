import { valueKind } from '../.././core/value.js';

/* global Plainview */
/*
 * Full-document JSON walker. Search consumes it in small batches so the page
 * can yield between chunks instead of building one giant index up front.
 */
((root) => {
  const MaxResults = 5000;

  function pushChildren(item, stack, seen) {
    if (item.value === null || valueKind(item.value) !== 'object') {
      return;
    }

    if (seen.has(item.value)) {
      return;
    }

    seen.add(item.value);
    if (Array.isArray(item.value)) {
      for (let index = item.value.length - 1; index >= 0; index -= 1) {
        stack.push({
          key: index,
          path: [...item.path, index],
          value: item.value[index],
          isRoot: false,
        });
      }

      return;
    }

    const keys = Object.keys(item.value);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      stack.push({
        key,
        path: [...item.path, key],
        value: item.value[key],
        isRoot: false,
      });
    }
  }

  function createWalker(rootValue) {
    const stack = [{ key: undefined, path: [], value: rootValue, isRoot: true }];
    const seen = new WeakSet();

    function take(limit) {
      const entries = [];
      while (entries.length < limit && stack.length > 0) {
        const item = stack.pop();
        entries.push({
          key: item.key,
          path: item.path,
          pathText: Plainview.jsonPath.pathToJsonPath(item.path),
          value: item.value,
          isRoot: item.isRoot,
        });
        pushChildren(item, stack, seen);
      }

      return { done: stack.length === 0, entries };
    }

    return { take };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonSearch: { createWalker, MaxResults },
  });
})(globalThis);
