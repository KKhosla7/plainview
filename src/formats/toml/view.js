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

  function detailsFromError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      message,
      line: valueKind(error?.line) === 'number' ? error.line : undefined,
      column: valueKind(error?.column) === 'number' ? error.column : undefined,
    };
  }

  async function buildToml(source) {
    const article = el('article', 'pv-doc pv-data-doc');
    let toml;
    try {
      toml = await Plainview.loadToml();
    } catch (error) {
      article.append(
        el('div', 'pv-doc-title', 'TOML unavailable'),
        errorPanel(error instanceof Error ? error.message : String(error)),
      );
      return { article, stats: null, error: true };
    }

    let value;
    try {
      value = toml.parse(String(source ?? ''));
    } catch (error) {
      const details = detailsFromError(error);
      article.append(
        el('div', 'pv-doc-title', 'Invalid TOML'),
        errorPanel(details.message, details.line, details.column),
      );
      return { article, stats: null, error: true };
    }

    return buildJsonValue(value, {
      source,
      copyLabel: 'Copy TOML',
      exportFormatId: 'toml',
      suffix: 'TOML',
    });
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildToml });
})(globalThis);
