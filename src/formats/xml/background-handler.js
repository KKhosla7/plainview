import { evaluateXmlXPath, parseXmlSource } from './xml-engine.js';

const api = globalThis.browser ?? globalThis.chrome;

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'plainview:xml') {
    return false;
  }
  const { expression, kind, source } = message;
  let result;
  if (kind === 'xpath') {
    result = evaluateXmlXPath(source, expression);
  } else {
    const parsed = parseXmlSource(source);
    result = parsed.ok
      ? {
          document: {
            documentElement: parsed.document.documentElement,
            stats: parsed.document.stats,
          },
          ok: true,
        }
      : parsed;
  }
  sendResponse({ id: message.id, result });
  return true;
});
