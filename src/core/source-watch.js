/* global Plainview */
/*
 * Poll the document URL and compare it with the source the reader mounted.
 * A change never silently replaces the page: by default a banner asks first.
 * Auto-reload is opt-in from Settings.
 */
((root) => {
  const PollInterval = 30_000;
  const FirstCheckDelay = 2500;
  const AutoReloadKey = Plainview.SETTING_KEYS.AutoReload;
  const AutoReloadDelayMs = 900;

  function el(tag, className, text) {
    const node = Plainview.createElement(tag);
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
    const fetched = await Plainview.requestText(url, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (fetched !== null) {
      return fetched;
    }

    return Plainview.requestTextXhr(url);
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
        return value;
      }
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
    Plainview.loadSetting(AutoReloadKey, false).then(
      (value) => {
        enabled = Boolean(value);
      },
      () => false,
    );
    const api = root.browser ?? root.chrome;
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

  function watchSource({ source, url, app, onReload, format }) {
    if (!(source && url)) {
      return { checkNow: () => undefined, stop: () => undefined };
    }

    const baseline = normalizeSource(source, format?.id);
    const banner = createBanner(() => {
      banner.hide();
      reloadDocument(onReload);
    });
    app.append(banner.element);

    let stopped = false;
    let inFlight = false;
    let lastNotified = null;
    let timer = 0;
    const autoReload = createAutoReloadState();

    function notify() {
      if (autoReload.enabled) {
        banner.setAuto('Reloading automatically…');
        banner.show();
        globalThis.setTimeout(() => {
          if (!stopped) {
            reloadDocument(onReload);
          }
        }, AutoReloadDelayMs);
        return;
      }
      banner.show();
    }

    async function checkNow() {
      if (stopped || inFlight || (document.visibilityState === 'hidden' && timer !== 0)) {
        return;
      }
      inFlight = true;
      try {
        const current = await readSource(url);
        if (current === null) {
          return;
        }
        const normalized = normalizeSource(current, format?.id);
        if (normalized === baseline || normalized === lastNotified) {
          return;
        }
        lastNotified = normalized;
        notify();
      } finally {
        inFlight = false;
      }
    }

    function schedule(delay) {
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(async () => {
        await checkNow();
        if (!stopped) {
          schedule(PollInterval);
        }
      }, delay);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkNow();
      }
    });

    schedule(FirstCheckDelay);

    return {
      checkNow,
      stop() {
        stopped = true;
        globalThis.clearTimeout(timer);
      },
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    watchSource,
    SOURCE_AUTO_RELOAD_KEY: AutoReloadKey,
  });
})(globalThis);
