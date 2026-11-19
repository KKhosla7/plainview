export function yieldToMain() {
  const { scheduler } = globalThis;
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
