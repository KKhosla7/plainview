import { createElement } from '../core/dom.js';
import { requestText, requestTextExtension, requestTextXhr } from '.././core/network.js';
import { SETTING_KEYS } from '.././core/setting-keys.js';
import { loadSetting } from '.././core/settings.js';

const POLL_INTERVAL = 10_000;
const FIRST_CHECK_DELAY = 2500;
const AutoReloadKey = SETTING_KEYS.AutoReload;
const AUTO_RELOAD_DELAY_MS = 900;

function el(tag, className, text) {
  const node = createElement(tag);
  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function button(className, label) {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

async function readSource(url) {
  if (url.startsWith('file:')) {
    const viaExtension = await requestTextExtension(url);
    if (viaExtension !== null) {
      return viaExtension;
    }
  }

  const fetched = await requestText(url, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (fetched !== null) {
    return fetched;
  }

  return requestTextXhr(url);
}

function normalizeSource(text, formatId) {
  const value = String(text ?? '')
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n');
  if (formatId === 'xml') {
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      if (!doc.querySelector('parsererror')) {
        return new XMLSerializer().serializeToString(doc.documentElement);
      }
    } catch {
      return value.replace(/^\s*<\?xml[^>]*\?>\s*/iu, '').trim();
    }

    return value.replace(/^\s*<\?xml[^>]*\?>\s*/iu, '').trim();
  }

  return value;
}

function reloadDocument(onReload) {
  if (onReload) {
    onReload();
  } else {
    location.reload();
  }
}

function createAutoReloadState() {
  let enabled = false;
  loadSetting(AutoReloadKey, false).then(
    (value) => {
      enabled = Boolean(value);
    },
    () => false,
  );
  const api = globalThis.browser ?? globalThis.chrome;
  try {
    api?.storage?.onChanged?.addListener((changes, area) => {
      if (area !== 'local' || !changes?.[AutoReloadKey]) {
        return;
      }
      enabled = Boolean(changes[AutoReloadKey].newValue);
    });
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
  }

  return {
    get enabled() {
      return enabled;
    },
  };
}

function createBanner(onReload) {
  const banner = el('div', 'pv-change-banner');
  banner.hidden = true;
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');

  const text = el('div', 'pv-change-text');
  const title = el('strong', '', 'Source changed');
  const detail = el('span', '', ' The file on disk is different from the open copy.');
  text.append(title, detail);

  const actions = el('div', 'pv-change-actions');
  const reload = button('pv-change-reload', 'Reload');
  const dismiss = button('pv-change-dismiss', 'Dismiss');
  actions.append(reload, dismiss);
  banner.append(text, actions);

  reload.addEventListener('click', onReload);
  dismiss.addEventListener('click', () => {
    banner.hidden = true;
  });

  return {
    element: banner,
    show() {
      banner.hidden = false;
      reload.focus();
    },
    hide() {
      banner.hidden = true;
    },
    setAuto(message) {
      detail.textContent = ` ${message}`;
      reload.hidden = true;
      dismiss.hidden = true;
    },
  };
}

function notifyChange({ autoReload, banner, onReload, onUpdate, source, isStopped }) {
  if (autoReload.enabled) {
    banner.setAuto('Refreshing automatically…');
    banner.show();
    globalThis.setTimeout(() => {
      if (!isStopped()) {
        if (onUpdate) {
          onUpdate(source);
        } else {
          reloadDocument(onReload);
        }
      }
    }, AUTO_RELOAD_DELAY_MS);
    return;
  }
  banner.show();
}

function createCheckNow({ state, url, format, baseline, banner, autoReload, onReload, onUpdate }) {
  return async function checkNow() {
    if (
      state.stopped ||
      state.inFlight ||
      (document.visibilityState === 'hidden' && state.timer !== 0)
    ) {
      return;
    }
    state.inFlight = true;
    try {
      const current = await readSource(url);
      if (current === null) {
        return;
      }
      const normalized = normalizeSource(current, format?.id);
      if (normalized === baseline) {
        state.lastNotified = null;
        banner.hide();
        return;
      }

      if (normalized === state.lastNotified) {
        return;
      }
      state.lastNotified = normalized;
      notifyChange({
        autoReload,
        banner,
        onReload,
        onUpdate,
        source: normalized,
        isStopped: () => state.stopped,
      });
    } finally {
      state.inFlight = false;
    }
  };
}

function scheduleCheck(state, checkNow, delay) {
  globalThis.clearTimeout(state.timer);
  state.timer = globalThis.setTimeout(async () => {
    await checkNow();
    if (!state.stopped) {
      scheduleCheck(state, checkNow, POLL_INTERVAL);
    }
  }, delay);
}

function watchSource({ source, url, app, onReload, onUpdate, format }) {
  if (!(source && url)) {
    return { checkNow: () => undefined, stop: () => undefined };
  }

  const baseline = normalizeSource(source, format?.id);
  const banner = createBanner(() => {
    banner.hide();
    reloadDocument(onReload);
  });
  app.append(banner.element);

  const state = { inFlight: false, lastNotified: null, stopped: false, timer: 0 };
  const autoReload = createAutoReloadState();
  const checkNow = createCheckNow({
    state,
    url,
    format,
    baseline,
    banner,
    autoReload,
    onReload,
    onUpdate,
  });
  const schedule = (delay) => scheduleCheck(state, checkNow, delay);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkNow();
    }
  });
  globalThis.addEventListener('focus', checkNow);

  schedule(FIRST_CHECK_DELAY);

  return {
    checkNow,
    stop() {
      state.stopped = true;
      globalThis.clearTimeout(state.timer);
    },
  };
}

export { watchSource };
