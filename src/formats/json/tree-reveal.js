import { yieldToMain } from '../../core/scheduler.js';
import { jsonPath } from '../.././formats/json/jsonpath-eval.js';
import { keyIndex } from './tree-model.js';

/*
 * Opens ancestors and small child pages until a search or query path is
 * available, without re-rendering the rest of the tree.
 */

function openContainer(state, ctx) {
  state.details.open = true;
  if (!state.loaded) {
    ctx.materializePage(state);
  }
}

async function renderToIndex(state, index, ctx) {
  if (index < state.rendered || state.rendered >= state.total) {
    return;
  }

  ctx.materializePage(state);
  if (index >= state.rendered) {
    await yieldToMain();
    await renderToIndex(state, index, ctx);
  }
}

async function prepareChild(state, segment, ctx) {
  const entryIndex = keyIndex(state, segment);
  if (entryIndex < 0 || entryIndex >= state.total) {
    return -1;
  }

  if (entryIndex >= state.rendered) {
    await renderToIndex(state, entryIndex, ctx);
  }

  return entryIndex;
}

async function revealSegments({ ctx, currentPath, index, path, state }) {
  if (index >= path.length) {
    return null;
  }

  const segment = path[index];
  if ((await prepareChild(state, segment, ctx)) < 0) {
    return null;
  }

  currentPath.push(segment);
  const pathText = jsonPath.pathToJsonPath(currentPath);
  const entry = ctx.indexRef.current.get(pathText);
  if (!entry) {
    return null;
  }

  if (index === path.length - 1) {
    if (entry.isContainer) {
      entry.node.open = true;
    }

    return entry;
  }

  if (!entry.isContainer) {
    return null;
  }
  const nextState = ctx.states.get(pathText);
  if (!nextState) {
    return null;
  }
  openContainer(nextState, ctx);
  return revealSegments({ ctx, currentPath, index: index + 1, path, state: nextState });
}

function createReveal(ctx) {
  return (path) => {
    const state = ctx.states.get('$');
    if (!state) {
      return null;
    }

    openContainer(state, ctx);
    return revealSegments({ ctx, currentPath: [], index: 0, path, state });
  };
}

export const jsonTreeReveal = { createReveal };
