/* global Plainview */
/*
 * Event listeners that return promises must not leak rejections. This wrapper
 * catches async handler failures and routes them to one place.
 */
((root) => {
  function onAsync(target, type, handler, options) {
    target.addEventListener(
      type,
      (event) => {
        Promise.resolve(handler(event)).catch((error) => {
          root.queueMicrotask(() => {
            throw error;
          });
        });
      },
      options,
    );
  }

  root.Plainview = Object.assign(root.Plainview || {}, { onAsync });
})(globalThis);
