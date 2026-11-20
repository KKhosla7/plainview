import { DOMParser } from '@xmldom/xmldom';
import fontoxpath from 'fontoxpath';
import { createDescriptorDocument } from './descriptor.js';

const { evaluateXPath, evaluateXPathToNodes } = fontoxpath;

function findParserError(node) {
  if (!node) {
    return null;
  }

  if (node.nodeType === 1 && node.localName === 'parsererror') {
    return node;
  }

  for (const child of Array.from(node.childNodes ?? [])) {
    const error = findParserError(child);
    if (error) {
      return error;
    }
  }

  return null;
}

function scalarType(value) {
  switch (Object.prototype.toString.call(value)) {
    case '[object String]':
      return 'string';
    case '[object Boolean]':
      return 'boolean';
    case '[object Number]':
      return 'number';
    default:
      return 'other';
  }
}

function parseXmlSource(source) {
  try {
    const doc = new DOMParser().parseFromString(source.replace(/^\uFEFF/u, ''), 'application/xml');
    const parserError = findParserError(doc.documentElement);
    if (parserError) {
      const message = (parserError.textContent || 'Malformed XML').trim();
      const lineColumn =
        /line\s+(\d+)\s+at\s+column\s+(\d+)/iu.exec(message) ??
        /line\s+(\d+)\s+column\s+(\d+)/iu.exec(message);
      return {
        error: {
          column: lineColumn ? Number(lineColumn[2]) : undefined,
          line: lineColumn ? Number(lineColumn[1]) : undefined,
          message,
        },
        ok: false,
      };
    }

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

function evaluateXmlXPath(source, expression) {
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
      const value = evaluateXPath(expression, doc);

      return { ok: true, value, valueType: scalarType(value) };
    }

    return { ids, ok: true };
  } catch (error) {
    return {
      error: { message: error instanceof Error ? error.message : String(error) },
      ok: false,
    };
  }
}

export { evaluateXmlXPath, parseXmlSource };
