/* global Plainview */
/*
 * JSONPath and JMESPath query controls.
 */
((root) => {
  const { el, button, inputClear, mark, unmark, selectHit, renderResults } =
    Plainview.jsonToolsShared;

  function findEntry(value, used, indexRef) {
    for (const entry of indexRef.current.values()) {
      if (used.has(entry)) {
        continue;
      }

      if (entry.value === value) {
        return entry;
      }

      if (
        (value === null || Plainview.valueKind(value) !== 'object') &&
        Object.is(entry.value, value)
      ) {
        return entry;
      }
    }

    return null;
  }

  function resultValues(result) {
    if (Array.isArray(result)) {
      return result;
    }

    if (result !== null && result !== undefined) {
      return [result];
    }

    return [];
  }

  function resultItems(values, indexRef, queryHits) {
    const used = new Set();
    const items = [];
    for (const value of values) {
      const entry = findEntry(value, used, indexRef);
      if (!entry) {
        items.push({ pathText: '(value)', value, rendered: false });
        continue;
      }
      used.add(entry);
      queryHits.push({ entry, pathText: entry.pathText });
      items.push({
        path: entry.path,
        pathText: entry.pathText,
        value: entry.value,
        rendered: true,
      });
      mark(entry, 'pv-json-query-hit');
    }

    return items;
  }

  function scalarValue(result) {
    if (Array.isArray(result) || (result !== null && Plainview.valueKind(result) === 'object')) {
      return;
    }

    return result;
  }

  function createQueryElements() {
    const pathWrap = el('form', 'pv-json-query');
    const language = el('select', 'pv-json-input pv-json-language');
    language.setAttribute('aria-label', 'Query language');
    for (const [value, label] of [
      ['jsonpath', 'JSONPath'],
      ['jmespath', 'JMESPath'],
    ]) {
      const option = el('option', '', label);
      option.value = value;
      language.append(option);
    }
    const pathInput = el('input', 'pv-json-input pv-json-path-input');
    pathInput.type = 'text';
    pathInput.placeholder = 'JSONPath, e.g. $.items[*].id';
    pathInput.setAttribute('aria-label', 'Query expression');
    pathInput.spellcheck = false;
    const queryButton = button('pv-meta-button', 'Query');
    queryButton.type = 'submit';
    const queryCount = el('span', 'pv-json-count', '');
    pathWrap.append(language, pathInput, queryButton, queryCount);
    return { pathWrap, language, pathInput, queryButton, queryCount };
  }

  function clearQuery(ctx) {
    for (const hit of ctx.queryHits) {
      unmark(hit.entry, 'pv-json-query-hit');
      unmark(hit.entry, 'pv-json-query-active');
    }
    ctx.queryHits = [];
    ctx.queryCount.textContent = '';
    ctx.queryResults.hidden = true;
    ctx.queryResults.replaceChildren();
    ctx.status.textContent = '';
    ctx.status.className = 'pv-json-status';
    ctx.pathInput.removeAttribute('aria-invalid');
  }

  function queryError(ctx, kind, error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.status.textContent = `${kind} error: ${message}`;
    ctx.status.classList.add('is-error');
    ctx.pathInput.setAttribute('aria-invalid', 'true');
  }

  function finishQuery(ctx, expression, total, scalar, items) {
    ctx.queryCount.textContent = `${total} ${total === 1 ? 'result' : 'results'}`;
    renderResults({
      hitClass: 'pv-json-query-hit',
      list: ctx.queryResults,
      matches: items,
      indexRef: ctx.indexRef,
      onReveal: ctx.revealPath,
    });
    ctx.onStart();
    if (total === 0) {
      ctx.status.textContent = `No matches for ${expression}. Try a shorter path or a wildcard.`;
      ctx.status.classList.add('is-empty');
      return;
    }

    if (scalar !== undefined) {
      ctx.status.textContent = `Result: ${JSON.stringify(scalar)}`;
    } else if (ctx.queryHits.length < total) {
      ctx.status.textContent = `${total - ctx.queryHits.length} result(s) can be opened from the list.`;
    } else {
      clearStatus(ctx.status);
    }
    selectHit(ctx.queryHits, 0, 'pv-json-query-active');
  }

  function clearStatus(status) {
    status.textContent = '';
    status.className = 'pv-json-status';
  }

  function runJsonPath(ctx, expression) {
    let results;
    try {
      results = Plainview.jsonPath.evaluate(ctx.rootValue, expression);
    } catch (error) {
      queryError(ctx, 'JSONPath', error);
      return;
    }
    const items = [];
    for (const result of results) {
      const pathText = Plainview.jsonPath.pathToJsonPath(result.path);
      const entry = ctx.indexRef.current.get(pathText);
      items.push({
        path: result.path,
        pathText,
        value: result.value,
        rendered: Boolean(entry),
      });
      if (entry) {
        ctx.queryHits.push({ entry, pathText });
        mark(entry, 'pv-json-query-hit');
      }
    }
    finishQuery(ctx, expression, results.length, undefined, items);
  }

  async function runJmespath(ctx, expression) {
    ctx.status.textContent = 'Loading JMESPath…';
    let jmespath;
    let result;
    try {
      jmespath = await Plainview.loadJmespath();
      result = jmespath.search(ctx.rootValue, expression);
    } catch (error) {
      queryError(ctx, 'JMESPath', error);
      return;
    }
    const values = resultValues(result);
    const items = resultItems(values, ctx.indexRef, ctx.queryHits);
    const scalar = scalarValue(result);
    if (items.length === 0 && scalar !== undefined) {
      items.push({ pathText: 'Result', value: scalar, rendered: false });
    }
    finishQuery(ctx, expression, values.length, scalar, items);
  }

  async function runQuery(ctx) {
    clearQuery(ctx);
    ctx.onStart();
    const expression = ctx.pathInput.value.trim();
    if (!expression) {
      return;
    }

    if (ctx.language.value === 'jmespath') {
      await runJmespath(ctx, expression);
    } else {
      runJsonPath(ctx, expression);
    }
  }

  function createJsonQuery({ rootValue, indexRef, revealPath, status, queryResults, onStart }) {
    const { pathWrap, language, pathInput, queryButton, queryCount } = createQueryElements();
    const ctx = {
      rootValue,
      indexRef,
      revealPath,
      status,
      queryResults,
      onStart,
      queryHits: [],
      queryCount,
      pathInput,
      language,
    };
    const queryClear = inputClear(pathInput, 'Clear query', () => clearQuery(ctx));
    pathWrap.insertBefore(queryClear, queryButton);
    pathWrap.addEventListener('submit', (event) => {
      event.preventDefault();
      runQuery(ctx);
    });
    pathInput.addEventListener('input', () => {
      if (!pathInput.value.trim()) {
        clearQuery(ctx);
      }
    });
    language.addEventListener('change', () => {
      pathInput.placeholder =
        language.value === 'jmespath'
          ? 'JMESPath, e.g. items[*].id'
          : 'JSONPath, e.g. $.items[*].id';
      clearQuery(ctx);
    });
    return pathWrap;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createJsonQuery });
})(globalThis);
