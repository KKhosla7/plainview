import { search } from 'jmespath';

/*
 * Builds the full interactive data reader inside a standalone export. The
 * embedded payload contains the parsed value/source, not a DOM snapshot.
 */
(() => {
  Plainview.loadJmespath = async () => ({ search });

  function buildDocument(documentData) {
    if (documentData.formatId === 'xml') {
      return Plainview.buildXml(documentData.source);
    }

    if (documentData.formatId === 'csv' || documentData.formatId === 'tsv') {
      return Plainview.buildCsv(documentData.source, {
        delimiter: documentData.delimiter,
        label: documentData.label,
      });
    }

    return Plainview.buildJsonValue(documentData.value, {
      copyLabel: `Copy ${documentData.formatId.toUpperCase()}`,
      exportFormatId: documentData.formatId,
      source: documentData.source,
      standalone: true,
      suffix: documentData.suffix,
    });
  }

  const payloadNode = document.querySelector('#pv-export-data');
  const root = document.querySelector('#pv-data-root');
  if (!(payloadNode && root)) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(payloadNode.textContent);
  } catch {
    return;
  }

  if (!payload?.document) {
    return;
  }

  document.documentElement.dataset.pvJsonTreeMode = 'virtual';
  document.documentElement.dataset.pvFormat = payload.document.formatId;
  const built = buildDocument(payload.document);
  root.replaceChildren(built.article);
})();
