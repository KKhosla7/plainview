function createXmlWorkerClient(runtime, source) {
  let nextId = 0;

  function request(kind, payload) {
    const id = nextId;
    nextId += 1;
    return runtime.sendMessage({ ...payload, id, kind, source, type: 'plainview:xml' });
  }

  return {
    parse: () => request('parse', {}),
    stop: () => undefined,
    xpath: (expression) => request('xpath', { expression }),
  };
}

export { createXmlWorkerClient };
