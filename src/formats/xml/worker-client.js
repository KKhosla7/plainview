function createXmlWorkerClient(runtime, source) {
  const worker = new Worker(runtime.getURL('xml-worker.js'));
  const pending = new Map();
  let nextId = 0;

  worker.addEventListener('message', (event) => {
    const { id, result } = event.data;
    const resolve = pending.get(id);
    if (!resolve) {
      return;
    }
    pending.delete(id);
    resolve(result);
  });

  function request(kind, payload) {
    const id = nextId;
    nextId += 1;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      worker.postMessage({ ...payload, id, kind });
    });
  }

  return {
    parse: () => request('parse', { source }),
    stop: () => worker.terminate(),
    xpath: (expression) => request('xpath', { expression, source }),
  };
}

export { createXmlWorkerClient };
