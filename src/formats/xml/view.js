import { createElement } from '../../core/dom.js';

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

  function buildXml(source) {
    const parsed = Plainview.parseXml(source);
    const article = el('article', 'pv-doc pv-data-doc');

    if (parsed.error) {
      article.append(
        el('div', 'pv-doc-title', 'Invalid XML'),
        Plainview.errorPanel(parsed.error.message, parsed.error.line, parsed.error.column),
      );
      return { article, stats: null, error: true };
    }

    const tree = Plainview.createXmlVirtualTree(parsed.doc.documentElement);
    const { stats } = tree;
    const exportState = {
      filter: null,
      kind: '',
      values: null,
      set(kind, values, filter = null) {
        this.kind = kind;
        this.values = values;
        this.filter = filter;
      },
      clear(kind) {
        if (this.kind === kind) {
          this.filter = null;
          this.kind = '';
          this.values = null;
        }
      },
      getFiltered() {
        return this.values;
      },
    };

    article.append(
      Plainview.createDataToolbar({
        article,
        source,
        summary:
          `${stats.elements.toLocaleString()} elements · ` +
          `${stats.attributes.toLocaleString()} attributes · ` +
          Plainview.formatBytes(source.length),
        copyLabel: 'Copy XML',
      }),
      Plainview.createXmlTools({
        tree: tree.element,
        doc: parsed.doc,
        byNode: tree.byNode,
        exportState,
      }),
      tree.element,
    );

    return {
      article,
      stats,
      error: false,
      exportData: {
        formatId: 'xml',
        hasFilter: () => Boolean(exportState.getFiltered()?.length),
        getDocument() {
          return { filter: exportState.filter, formatId: 'xml', source };
        },
        getData(scope) {
          const nodes = exportState.getFiltered();
          if (scope === 'filtered') {
            return nodes?.length ? { data: nodes, formatId: 'xml', kind: 'xml-nodes' } : null;
          }

          return { data: source, formatId: 'xml', kind: 'xml' };
        },
      },
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { buildXml });
})(globalThis);
