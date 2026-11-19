import { copyText } from '../../core/clipboard.js';
import { onAsync } from '../../core/events.js';
import { createXmlQuery } from './query.js';
import { createXmlSearch } from './search.js';
import { xmlToolsShared } from './tools-shared.js';

/* global Plainview */
/*
 * XML search and XPath controls. Search and query state live in their own
 * modules; this file composes the toolbar and path-copy behavior.
 */
const { el, CopyResetMs } = xmlToolsShared;

function createXmlTools({ tree, doc, byNode, exportState }) {
  const tools = el('div', 'pv-json-tools pv-xml-tools');
  const status = el('div', 'pv-json-status');
  status.setAttribute('role', 'status');
  const search = createXmlSearch({ byNode, exportState, status });
  const query = createXmlQuery({ doc, byNode, exportState, status });

  onAsync(tree, 'click', async (event) => {
    const target = event.target?.closest?.('.pv-xml-path') ?? null;
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const path = target.getAttribute('data-xpath') || '';
    const ok = await copyText(path);
    const previous = target.textContent;
    target.textContent = ok ? 'Copied' : 'Failed';
    globalThis.setTimeout(() => {
      target.textContent = previous;
    }, CopyResetMs);
  });

  tools.append(search, query, status);
  return tools;
}

export { createXmlTools };
