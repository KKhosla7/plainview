import { watchSource } from '../core/source-watch.js';

function startSourceWatch({ source, url, app, format, onUpdate }) {
  const sourceWatch = watchSource({
    source,
    url,
    app,
    format,
    onUpdate,
  });
  globalThis.addEventListener('pagehide', () => sourceWatch.stop(), { once: true });

  return sourceWatch;
}

export { startSourceWatch };
