export function primePath({
  state,
  path,
  nodeValue,
  depth,
  isContainer,
  entryCount,
  childEntries,
  pathTextFor,
  autoRows,
}) {
  if (!isContainer(nodeValue)) {
    return;
  }
  const total = entryCount(nodeValue);
  if (depth > 0 && depth >= state.pageDepth) {
    return;
  }
  const cost = total + 1;
  if (depth === 0) {
    state.autoRows = cost;
  } else {
    if (state.autoRows + cost > autoRows) {
      return;
    }
    state.autoRows += cost;
  }
  state.expanded.add(pathTextFor(path));
  for (let index = 0; index < total; index += 1) {
    const [key, child] = childEntries(nodeValue, index);
    primePath({
      state,
      path: [...path, key],
      nodeValue: child,
      depth: depth + 1,
      isContainer,
      entryCount,
      childEntries,
      pathTextFor,
      autoRows,
    });
  }
}
