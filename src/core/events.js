export function onAsync(target, type, handler, options) {
  target.addEventListener(
    type,
    (event) => {
      Promise.resolve(handler(event)).catch((error) => {
        globalThis.queueMicrotask(() => {
          throw error;
        });
      });
    },
    options,
  );
}
