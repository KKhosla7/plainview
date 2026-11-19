function createJsonExportState() {
  return {
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
  };
}

export { createJsonExportState };
