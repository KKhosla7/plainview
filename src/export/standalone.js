import { search } from 'jmespath';
import { setJmespathLoader } from '../formats/jmespath/loader.js';
import { applyFilter, buildDocument } from './standalone-data.js';

(async () => {
  setJmespathLoader(async () => ({ search }));

  const payloadNode = document.querySelector('#pv-export-data');
  const root = document.querySelector('#pv-data-root');
  if (!(payloadNode && root)) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(payloadNode.textContent);
  } catch {
    return;
  }

  if (!payload?.document) {
    return;
  }

  document.documentElement.dataset.pvJsonTreeMode = 'virtual';
  document.documentElement.dataset.pvFormat = payload.document.formatId;
  const built = await buildDocument(payload.document);
  root.replaceChildren(built.article);
  applyFilter(built.article, payload.document.filter);
})();
