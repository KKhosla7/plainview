import { DOMParser } from '@xmldom/xmldom';
import fontoxpath from 'fontoxpath';
import { createDescriptorDocument } from './descriptor.js';

const { evaluateXPath, evaluateXPathToNodes } = fontoxpath;

function parse(source) {
  try {
    const doc = new DOMParser().parseFromString(source.replace(/^\uFEFF/u, ''), 'application/xml');
    const result = createDescriptorDocument(doc);
    if (!result.documentElement) {
      return { error: { message: 'The document has no root element.' }, ok: false };
    }

    return { document: result, ok: true };
  } catch (error) {
    const locator = error.locator || {};
    return {
      error: {
        column: locator.columnNumber,
        line: locator.lineNumber,
        message: error instanceof Error ? error.message : String(error),
      },
      ok: false,
    };
  }
}

function xpath(source, expression) {
  try {
    const doc = new DOMParser().parseFromString(source.replace(/^\uFEFF/u, ''), 'application/xml');
    const result = createDescriptorDocument(doc);
    const ids = [];
    try {
      for (const node of evaluateXPathToNodes(expression, doc)) {
        const descriptor = result.byNode.get(node) ?? result.byNode.get(node.ownerElement);
        if (descriptor) {
          ids.push(descriptor.id);
        }
      }
    } catch {
      return { ok: true, value: evaluateXPath(expression, doc) };
    }

    return { ids, ok: true };
  } catch (error) {
    return {
      error: { message: error instanceof Error ? error.message : String(error) },
      ok: false,
    };
  }
}

self.addEventListener('message', (event) => {
  const { expression, id, kind, source } = event.data;
  const result = kind === 'xpath' ? xpath(source, expression) : parse(source);
  self.postMessage({ id, result });
});
