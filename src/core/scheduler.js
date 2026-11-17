/* global Plainview */
/*
 * Yields a long document walk back to the browser between short batches.
 */
((root) => {
  const { scheduler } = root;

  function yieldToMain() {
    if (scheduler?.yield) {
      return scheduler.yield();
    }

    if (scheduler?.postTask) {
      return scheduler.postTask(() => undefined, { priority: 'user-visible' });
    }

    return new Promise((resolve) => {
      globalThis.setTimeout(resolve, 0);
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { yieldToMain });
})(globalThis);
