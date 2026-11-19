import { createElement } from '../../core/dom.js';
import { valueKind } from '../../core/value.js';
import { errorPanel } from '../.././formats/shared/error-panel.js';
import { buildJsonValue } from '../json/view.js';

/* global Plainview */
((root) => {
  function el(tag, className, text) {
    const node = createElement(tag);
    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function errorDetails(error) {
    const message = error instanceof Error ? error.message : String(error);
    const mark = error?.mark;
    if (!mark || valueKind(mark.line) !== 'number') {
      return { message };
    }

    return {
      message: error.reason || message,
      line: mark.line + 1,
      column: valueKind(mark.column) === 'number' ? mark.column + 1 : undefined,
    };
  }

  async function buildYaml(source) {
    const article = el('article', 'pv-doc pv-data-doc');
    let yaml;
    try {
      yaml = await Plainview.loadYaml();
    } catch (error) {
      article.append(
        el('div', 'pv-doc-title', 'YAML unavailable'),
        errorPanel(error instanceof Error ? error.message : String(error)),
      );
      return { article, stats: null, error: true };
    }

    let documents;
    try {
      documents = yaml.loadAll(String(source ?? ''), undefined, {
        filename: 'document.yaml',
        json: true,
        schema: yaml.DEFAULT_SCHEMA,
      });
    } catch (error) {
      const details = errorDetails(error);
      article.append(
        el('div', 'pv-doc-title', 'Invalid YAML'),
        errorPanel(details.message, details.line, details.column),
      );
      return { article, stats: null, error: true };
    }

    const value = documents.length === 1 ? documents[0] : documents;
    const suffix = documents.length > 1 ? `YAML · ${documents.length} documents` : 'YAML';
    return buildJsonValue(value, {
      source,
      copyLabel: 'Copy YAML',
      exportFormatId: 'yaml',
      suffix,
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildYaml });
})(globalThis);
