function createXmlWorkerClient(runtime, source) {
  let nextId = 0;

  async function request(kind, payload) {
    const id = nextId;
    nextId += 1;
    const response = await runtime.sendMessage({
      ...payload,
      id,
      kind,
      source,
      type: 'plainview:xml',
    });

    return response?.result;
  }

  return {
    parse: () => request('parse', {}),
    stop: () => undefined,
    xpath: (expression) => request('xpath', { expression }),
  };
}

export { createXmlWorkerClient };
