import { onAsync } from '../../core/events.js';
import { jsonToolsShared } from '../.././formats/json/tools-shared.js';
import { xmlToolsShared } from '../.././formats/xml/tools-shared.js';

const { el, button, exportNode, mark, unmark, selectHit, Attribute, Document } = xmlToolsShared;

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
  const queryRow = el('div', 'pv-json-query-row');
  const countRow = el('div', 'pv-json-count-row');
  const query = el('input', 'pv-json-input pv-json-path-input');
  query.type = 'text';
  query.placeholder = 'XPath, e.g. //book[@id="2"]/title';
  query.setAttribute('aria-label', 'XPath query');
  query.spellcheck = false;
  const queryButton = button('pv-meta-button', 'Query');
  queryButton.type = 'submit';
  const queryCount = el('span', 'pv-json-count', '');
  queryRow.append(query, queryButton);
  countRow.append(queryCount);
  queryWrap.append(queryRow, countRow);
  return { queryWrap, queryRow, query, queryButton, queryCount };
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

function applyEntries({ entries, total, state, queryCount, status, expression }) {
  for (const entry of entries) {
    state.hits.push(entry);
    mark(entry, 'pv-xml-query-hit');
  }
  queryCount.textContent = `${total} ${total === 1 ? 'result' : 'results'}`;
  if (total > 0) {
    state.exportState?.set(
      'query',
      entries.flatMap((entry) => {
        const exported = exportNode(entry.source);
        return exported ? [exported] : [];
      }),
      { kind: 'query', text: expression },
    );
  } else {
    state.exportState?.clear('query');
  }

  if (total === 0) {
    status.textContent = `No nodes matched ${expression}.`;
    status.classList.add('is-empty');
    return;
  }

  if (entries.length < total) {
    status.textContent = `${total - entries.length} result(s) are below the tree cap.`;
  }
  selectHit(state.hits, 0, 'pv-xml-query-active');
}

function showXPathError({ error, status, query }) {
  status.textContent = `XPath error: ${error instanceof Error ? error.message : String(error)}`;
  status.classList.add('is-error');
  query.setAttribute('aria-invalid', 'true');
}

function formatWorkerValue({ value, valueType }) {
  if (valueType === 'string') {
    return `Result: ${JSON.stringify(value)}`;
  }

  if (valueType === 'boolean') {
    return `Result: ${value ? 'true' : 'false'}`;
  }

  return `Result: ${value}`;
}

async function runWorkerXPath({
  byId,
  byNode,
  expression,
  query,
  queryCount,
  state,
  status,
  xpath,
}) {
  byNode.ensureAll?.();
  let response;
  try {
    response = await xpath(expression);
  } catch (error) {
    showXPathError({ error, status, query });
    return;
  }

  if (!response?.ok) {
    showXPathError({
      error: response?.error?.message ?? 'Unknown XML worker error',
      status,
      query,
    });
    return;
  }

  if (Object.hasOwn(response, 'value')) {
    status.textContent = formatWorkerValue(response);
    return;
  }
  const ids = response.ids ?? [];
  const entries = ids.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
  applyEntries({ entries, total: ids.length, state, queryCount, status, expression });
}

function runNativeXPathQuery({
  byId,
  doc,
  expression,
  nativeByNode,
  query,
  queryCount,
  state,
  status,
}) {
  const XPathResultType = globalThis.XPathResult;
  let result;
  try {
    result = doc.evaluate(expression, doc, null, XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE, null);
  } catch {
    try {
      result = doc.evaluate(expression, doc, null, XPathResultType.ANY_TYPE, null);
    } catch (error) {
      showXPathError({ error, status, query });
      return;
    }
  }
  const scalar = scalarResult(result.resultType, result, XPathResultType);
  if (scalar) {
    status.textContent = scalar;
    return;
  }
  const nodes = nodesFromResult(result, XPathResultType).filter(Boolean);
  const entries = nodes.flatMap((node) => {
    const descriptor = mappedEntry(node, nativeByNode, doc);
    const entry = descriptor ? byId.get(descriptor.id) : null;
    return entry ? [entry] : [];
  });
  applyEntries({ entries, total: nodes.length, state, queryCount, status, expression });
}

async function runXPathQuery(options) {
  const { query, queryCount, state, status } = options;
  state.exportState?.clear('query');
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
  options.byNode.ensureAll?.();
  if (options.xpath) {
    await runWorkerXPath({ ...options, expression });
    return;
  }
  runNativeXPathQuery({ ...options, expression });
}

function createXmlQuery({ byId, byNode, doc, exportState, nativeByNode, status, xpath }) {
  const { queryWrap, queryRow, query, queryButton, queryCount } = createQueryElements();
  const state = { exportState, hits: [] };
  const clear = jsonToolsShared.inputClear(query, 'Clear XPath query', () => {
    query.value = '';
    state.hits = clearQueryHits({ hits: state.hits, queryCount, status, query });
    state.exportState?.clear('query');
    query.focus();
  });
  queryRow.insertBefore(clear, queryButton);
  onAsync(queryWrap, 'submit', async (event) => {
    event.preventDefault();
    await runXPathQuery({
      byId,
      byNode,
      doc,
      nativeByNode,
      status,
      query,
      queryCount,
      state,
      xpath,
    });
  });
  query.addEventListener('input', () => {
    if (!query.value.trim()) {
      state.hits = clearQueryHits({ hits: state.hits, queryCount, status, query });
      state.exportState?.clear('query');
    }
  });
  return queryWrap;
}

export { createXmlQuery };
