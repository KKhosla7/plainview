/* global Plainview */
/*
 * XPath query controls and result mapping.
 */
((root) => {
  const { el, button, mark, unmark, selectHit, Attribute, Document } = Plainview.xmlToolsShared;

  function scalarResult(resultType, result, XPathResultType) {
    if (resultType === XPathResultType.NUMBER_TYPE) {
      return `Result: ${result.numberValue}`;
    }

    if (resultType === XPathResultType.STRING_TYPE) {
      return `Result: ${JSON.stringify(result.stringValue)}`;
    }

    if (resultType === XPathResultType.BOOLEAN_TYPE) {
      return `Result: ${result.booleanValue ? 'true' : 'false'}`;
    }

    return null;
  }

  function nodesFromResult(result, XPathResultType) {
    const nodes = [];
    if (result.resultType === XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE) {
      for (let index = 0; index < result.snapshotLength; index += 1) {
        nodes.push(result.snapshotItem(index));
      }

      return nodes;
    }

    if (result.resultType === XPathResultType.UNORDERED_NODE_SNAPSHOT_TYPE) {
      for (let index = 0; index < result.snapshotLength; index += 1) {
        nodes.push(result.snapshotItem(index));
      }

      return nodes;
    }

    if (result.resultType === XPathResultType.FIRST_ORDERED_NODE_TYPE) {
      if (result.singleNodeValue) {
        nodes.push(result.singleNodeValue);
      }

      return nodes;
    }

    if (result.resultType === XPathResultType.UNORDERED_NODE_ITERATOR_TYPE) {
      let node = result.iterateNext();
      while (node) {
        nodes.push(node);
        node = result.iterateNext();
      }
    }

    return nodes;
  }

  function mappedEntry(node, byNode, doc) {
    if (node.nodeType === Attribute) {
      return byNode.get(node.ownerElement);
    }

    if (node.nodeType === Document) {
      return byNode.get(doc.documentElement);
    }

    return byNode.get(node);
  }

  function createQueryElements() {
    const queryWrap = el('form', 'pv-json-query');
    const query = el('input', 'pv-json-input pv-json-path-input');
    query.type = 'text';
    query.placeholder = 'XPath, e.g. //book[@id="2"]/title';
    query.setAttribute('aria-label', 'XPath query');
    query.spellcheck = false;
    const queryButton = button('pv-meta-button', 'Query');
    queryButton.type = 'submit';
    const queryCount = el('span', 'pv-json-count', '');
    queryWrap.append(query, queryButton, queryCount);
    return { queryWrap, query, queryCount };
  }

  function clearQueryHits({ hits, queryCount, status, query }) {
    for (const hit of hits) {
      unmark(hit, 'pv-xml-query-hit');
      unmark(hit, 'pv-xml-query-active');
    }
    queryCount.textContent = '';
    status.textContent = '';
    status.className = 'pv-json-status';
    query.removeAttribute('aria-invalid');
    return [];
  }

  function runXPathQuery({ doc, byNode, status, query, queryCount, state }) {
    state.hits = clearQueryHits({
      hits: state.hits,
      queryCount,
      status,
      query,
    });
    const expression = query.value.trim();
    if (!expression) {
      return;
    }
    const XPathResultType = globalThis.XPathResult;
    let result;
    try {
      result = doc.evaluate(
        expression,
        doc,
        null,
        XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
    } catch {
      try {
        result = doc.evaluate(expression, doc, null, XPathResultType.ANY_TYPE, null);
      } catch (error) {
        status.textContent = `XPath error: ${
          error instanceof Error ? error.message : String(error)
        }`;
        status.classList.add('is-error');
        query.setAttribute('aria-invalid', 'true');
        return;
      }
    }
    const scalar = scalarResult(result.resultType, result, XPathResultType);
    if (scalar) {
      status.textContent = scalar;
      return;
    }
    const nodes = nodesFromResult(result, XPathResultType).filter(Boolean);
    for (const node of nodes) {
      const entry = mappedEntry(node, byNode, doc);
      if (!entry) {
        continue;
      }
      state.hits.push(entry);
      mark(entry, 'pv-xml-query-hit');
    }
    queryCount.textContent = `${nodes.length} ${nodes.length === 1 ? 'result' : 'results'}`;
    if (nodes.length === 0) {
      status.textContent = `No nodes matched ${expression}.`;
      status.classList.add('is-empty');
      return;
    }

    if (state.hits.length < nodes.length) {
      status.textContent = `${nodes.length - state.hits.length} result(s) are below the tree cap.`;
    }
    selectHit(state.hits, 0, 'pv-xml-query-active');
  }

  function createXmlQuery({ doc, byNode, status }) {
    const { queryWrap, query, queryCount } = createQueryElements();
    const state = { hits: [] };
    queryWrap.addEventListener('submit', (event) => {
      event.preventDefault();
      runXPathQuery({
        doc,
        byNode,
        status,
        query,
        queryCount,
        state,
      });
    });
    query.addEventListener('input', () => {
      if (!query.value.trim()) {
        state.hits = clearQueryHits({ hits: state.hits, queryCount, status, query });
      }
    });
    return queryWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createXmlQuery });
})(globalThis);
