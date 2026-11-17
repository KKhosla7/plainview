/* global Plainview */
/*
 * Batched full-document search runner. Each batch yields to the browser before
 * the next one is read, keeping input and scrolling responsive.
 */
((root) => {
  const { mark, renderResults } = Plainview.jsonToolsShared;
  const SearchBatchNodes = 500;
  const RenderIntervalMs = 100;

  function searchable(entry) {
    const key = entry.isRoot ? '' : String(entry.key);
    const quotedKey = entry.isRoot ? '' : JSON.stringify(String(entry.key));
    const primitive = Plainview.jsonToolsShared.primitiveText(entry.value);
    const quotedValue =
      Plainview.valueKind(entry.value) === 'string' ? JSON.stringify(entry.value) : primitive;
    const preview = primitive || Plainview.jsonToolsShared.previewValue(entry.value);
    return [
      entry.pathText,
      key,
      quotedKey,
      primitive,
      quotedValue,
      preview,
      key ? `${key}: ${primitive}` : '',
      key ? `${key}:${primitive}` : '',
      quotedKey ? `${quotedKey}: ${quotedValue}` : '',
      quotedKey ? `${quotedKey}:${quotedValue}` : '',
      key ? `${key} ${primitive}` : '',
    ]
      .join(' ')
      .toLocaleLowerCase();
  }

  function matchItem(entry, indexRef, hits) {
    const node = indexRef.current.get(entry.pathText);
    if (node) {
      hits.push({ entry: node });
      mark(node, 'pv-json-hit');
    }

    return {
      ...entry,
      rendered: Boolean(node),
    };
  }

  function finish(ctx) {
    if (!ctx.isActive()) {
      return null;
    }

    if (ctx.total === 0) {
      ctx.status.textContent = `No matches for ${ctx.query}.`;
      ctx.status.classList.add('is-empty');
    } else if (ctx.total > ctx.maxResults) {
      ctx.status.textContent = `First ${ctx.maxResults.toLocaleString()} matches shown; refine the search.`;
      ctx.status.classList.add('is-empty');
    } else {
      ctx.status.textContent = '';
    }

    return ctx;
  }

  function renderBatch(ctx, done) {
    ctx.count.textContent = `${ctx.total.toLocaleString()} ${
      ctx.total === 1 ? 'match' : 'matches'
    }`;
    ctx.prev.disabled = ctx.hits.length === 0;
    ctx.next.disabled = ctx.hits.length === 0;
    const now = performance.now();
    if (done || now - ctx.lastRender >= RenderIntervalMs) {
      renderResults({
        hitClass: 'pv-json-hit',
        list: ctx.searchResults,
        matches: ctx.matches,
        indexRef: ctx.indexRef,
        onReveal: ctx.revealPath,
      });
      ctx.lastRender = now;
    }
  }

  async function processBatch(ctx) {
    if (ctx.done) {
      return finish(ctx);
    }

    if (!ctx.isActive()) {
      return null;
    }

    const batch = ctx.walker.take(SearchBatchNodes);
    ctx.done = batch.done;
    if (!ctx.isActive()) {
      return null;
    }

    for (const entry of batch.entries) {
      if (!searchable(entry).includes(ctx.needle)) {
        continue;
      }
      ctx.total += 1;
      if (ctx.matches.length >= ctx.maxResults) {
        continue;
      }
      const item = matchItem(entry, ctx.indexRef, ctx.hits);
      ctx.matches.push(item);
    }

    renderBatch(ctx, ctx.done);
    await Plainview.yieldToMain();
    return processBatch(ctx);
  }

  function runSearch(options) {
    const ctx = {
      ...options,
      done: false,
      hits: [],
      lastRender: 0,
      matches: [],
      maxResults: Plainview.jsonSearch.MaxResults,
      total: 0,
      walker: Plainview.jsonSearch.createWalker(options.rootValue),
    };
    return processBatch(ctx);
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonSearchRunner: { runSearch },
  });
})(globalThis);
