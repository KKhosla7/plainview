import { buildCsv } from '../formats/csv/view.js';
import { buildJsonValue } from '../formats/json/view.js';
import { buildXml } from '../formats/xml/view.js';

function buildDocument(documentData) {
  if (documentData.formatId === 'xml') {
    return buildXml(documentData.source);
  }

  if (documentData.formatId === 'csv' || documentData.formatId === 'tsv') {
    return buildCsv(documentData.source, {
      delimiter: documentData.delimiter,
      label: documentData.label,
    });
  }

  return buildJsonValue(documentData.value, {
    copyLabel: `Copy ${documentData.formatId.toUpperCase()}`,
    exportFormatId: documentData.formatId,
    source: documentData.source,
    standalone: true,
    suffix: documentData.suffix,
  });
}

function setInput(input, value) {
  if (!input) {
    return false;
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function applyFilter(article, filter) {
  if (!filter) {
    return;
  }

  if (filter.kind === 'search') {
    setInput(
      article.querySelector(
        '.pv-json-search .pv-json-input, .pv-csv-tools .pv-json-input, .pv-xml-tools .pv-json-search .pv-json-input',
      ),
      filter.text,
    );
    return;
  }

  if (filter.kind === 'csv') {
    setInput(article.querySelector('.pv-csv-tools .pv-json-input'), filter.text);
    return;
  }

  const language = article.querySelector('.pv-json-language');
  if (language && filter.language) {
    language.value = filter.language;
    language.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const input = article.querySelector('.pv-json-path-input');
  if (setInput(input, filter.text)) {
    input.closest('form')?.requestSubmit();
  }
}

export { applyFilter, buildDocument };
