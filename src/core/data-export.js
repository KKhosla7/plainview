/* global Plainview */
/*
 * Native data exports. These are always plain, uncompressed text and are
 * independent of the standalone HTML export/compression setting.
 */
((root) => {
  const Mime = {
    csv: 'text/csv;charset=utf-8',
    json: 'application/json;charset=utf-8',
    toml: 'application/toml;charset=utf-8',
    tsv: 'text/tab-separated-values;charset=utf-8',
    xml: 'application/xml;charset=utf-8',
    yaml: 'application/yaml;charset=utf-8',
  };

  function extensionFor(formatId) {
    if (formatId === 'jsonc') {
      return 'json';
    }

    return formatId || 'txt';
  }

  function dataFileName(fileName, formatId) {
    const base = String(fileName || 'document').replace(/\.[^.]+$/u, '') || 'document';
    return `${base}.${extensionFor(formatId)}`;
  }

  function jsonText(value) {
    const seen = new WeakSet();
    return `${JSON.stringify(
      value,
      (_key, item) => {
        if (item !== null && Plainview.valueKind(item) === 'object') {
          if (seen.has(item)) {
            return '[circular]';
          }
          seen.add(item);
        }

        return item;
      },
      2,
    )}\n`;
  }

  async function yamlText(value) {
    const yaml = await Plainview.loadYaml();
    return yaml.dump(value, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  }

  async function tomlText(value) {
    const toml = await Plainview.loadToml();
    const document = Array.isArray(value) || value === null ? { results: value } : value;
    return `${toml.stringify(document)}\n`;
  }

  function csvCell(value, delimiter) {
    const text = String(value ?? '');
    if (text.includes(delimiter) || /["\r\n]/u.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  }

  function csvText({ delimiter, header, rows }) {
    const lines = [header, ...rows].map((row) =>
      row.map((cell) => csvCell(cell, delimiter)).join(delimiter),
    );
    return `${lines.join('\n')}\n`;
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function xmlNodeText(node) {
    if (node.nodeType === Node.ATTRIBUTE_NODE) {
      return `<attribute name="${escapeXml(node.name)}">${escapeXml(node.value)}</attribute>`;
    }

    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      return `<text>${escapeXml(node.nodeValue)}</text>`;
    }

    const target = node.nodeType === Node.DOCUMENT_NODE ? node.documentElement : node;
    return new XMLSerializer().serializeToString(target);
  }

  function xmlNodesText(nodes) {
    const parts = [];
    for (const node of nodes) {
      if (node) {
        parts.push(`  ${xmlNodeText(node)}`);
      }
    }

    return `<selection>\n${parts.join('\n')}\n</selection>\n`;
  }

  function nativeText(exported) {
    if (exported.kind === 'json') {
      return jsonText(exported.data);
    }

    if (exported.kind === 'yaml') {
      return yamlText(exported.data);
    }

    if (exported.kind === 'toml') {
      return tomlText(exported.data);
    }

    if (exported.kind === 'csv') {
      return csvText(exported);
    }

    if (exported.kind === 'text') {
      return String(exported.data ?? '');
    }

    if (exported.kind === 'xml') {
      const source = String(exported.data ?? '');
      return source.endsWith('\n') ? source : `${source}\n`;
    }

    return xmlNodesText(exported.data);
  }

  async function serializeNative({ exportData, scope, fileName }) {
    const exported = exportData.getData(scope);
    if (!exported) {
      return null;
    }

    const text = await nativeText(exported);
    const formatId = exported.formatId || exportData.formatId;
    return {
      fileName: dataFileName(fileName, formatId),
      formatId,
      scope,
      text,
    };
  }

  async function serializeScopes({ exportData, fileName }) {
    const results = await Promise.all(
      ['filtered', 'complete'].map((scope) => {
        if (scope === 'filtered' && !exportData.hasFilter()) {
          return Promise.resolve(null);
        }

        return serializeNative({ exportData, scope, fileName });
      }),
    );
    return { entries: results.filter(Boolean), fileName };
  }

  async function exportNative({ exportData, scope, fileName }) {
    const entry = await serializeNative({ exportData, scope, fileName });
    if (!entry) {
      return false;
    }

    const blob = new Blob([entry.text], {
      type: Mime[entry.formatId] || 'text/plain;charset=utf-8',
    });
    Plainview.downloadBlob(blob, entry.fileName);
    return true;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    dataExport: { dataFileName, exportNative, serializeScopes },
  });
})(globalThis);
