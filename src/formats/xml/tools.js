/* global Plainview */
/*
 * XML search and XPath controls. Search and query state live in their own
 * modules; this file composes the toolbar and path-copy behavior.
 */
((root) => {
  const { el, CopyResetMs } = Plainview.xmlToolsShared;

  function createXmlTools({ tree, doc, byNode, exportState }) {
    const tools = el('div', 'pv-json-tools pv-xml-tools');
    const status = el('div', 'pv-json-status');
    status.setAttribute('role', 'status');
    const search = Plainview.createXmlSearch({ byNode, exportState, status });
    const query = Plainview.createXmlQuery({ doc, byNode, exportState, status });

    Plainview.onAsync(tree, 'click', async (event) => {
      const target = event.target?.closest?.('.pv-xml-path') ?? null;
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const path = target.getAttribute('data-xpath') || '';
      const ok = await Plainview.copyText(path);
      const previous = target.textContent;
      target.textContent = ok ? 'Copied' : 'Failed';
      globalThis.setTimeout(() => {
        target.textContent = previous;
      }, CopyResetMs);
    });

    tools.append(search, query, status);
    return tools;
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createXmlTools });
})(globalThis);
