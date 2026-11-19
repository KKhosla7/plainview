function setQueryExport(ctx, expression, items) {
  if (items.length > 0) {
    ctx.exportState?.set(
      'query',
      items.map((item) => item.value),
      {
        kind: 'query',
        language: ctx.language.value,
        text: expression,
      },
    );
  } else {
    ctx.exportState?.clear('query');
  }
}

export { setQueryExport };
