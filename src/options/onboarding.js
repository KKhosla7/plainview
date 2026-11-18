/* global chrome, browser */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const { userAgent } = navigator;
  const { version } = api.runtime.getManifest();
  document.querySelector('#version').textContent = version;
  const firefox = /Firefox/iu.test(userAgent);
  const edge = /Edg\//u.test(userAgent);
  const intro = document.querySelector('#intro');
  const steps = document.querySelector('#steps');
  const firefoxNote = document.querySelector('#firefoxNote');
  const accessState = document.querySelector('#accessState');
  const accessIcon = document.querySelector('#accessIcon');
  const accessStatus = document.querySelector('#accessStatus');
  const accessHint = document.querySelector('#accessHint');

  function addStep(title, body) {
    const item = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = title;
    item.append(strong, document.createTextNode(body));
    steps.append(item);
  }

  if (firefox) {
    intro.textContent =
      'Plainview is running in Firefox. Firefox needs file access enabled, and its built-in JSON viewer may take precedence for JSON responses.';
    addStep(
      'Allow file access:',
      'Open about:addons → Plainview → Permissions and allow access to file URLs.',
    );
    addStep(
      'Open a local file:',
      'Use Ctrl+O / Cmd+O or drag a Markdown, YAML, TOML, CSV, XML or log file into Firefox.',
    );
    addStep('Test it:', 'If the rendered Plainview reader appears, setup is complete.');
    firefoxNote.hidden = false;
    firefoxNote.textContent =
      'Firefox limitation: Firefox may render JSON with its own viewer before Plainview can take over. Markdown and other supported formats should still open in Plainview.';
  } else if (edge) {
    intro.textContent =
      'Plainview is running in Microsoft Edge. Edge needs file access enabled before it can render local files.';
    addStep('Open extensions:', 'Go to edge://extensions.');
    addStep('Allow file URLs:', 'Open Plainview → Details and enable “Allow access to file URLs”.');
    addStep(
      'Test it:',
      'Open a local Markdown, JSON, YAML, TOML, CSV, XML or log file. Plainview should replace the raw text view.',
    );
    firefoxNote.hidden = false;
    firefoxNote.textContent =
      'If Plainview was installed manually, reload it once from edge://extensions after changing permissions.';
  } else {
    intro.textContent =
      'Plainview is running in Chrome. Chrome needs file access enabled before it can render local files.';
    addStep('Open extensions:', 'Go to chrome://extensions.');
    addStep('Allow file URLs:', 'Open Plainview → Details and enable “Allow access to file URLs”.');
    addStep(
      'Test it:',
      'Open a local Markdown, JSON, YAML, TOML, CSV, XML or log file. Plainview should replace the raw text view.',
    );
    firefoxNote.hidden = false;
    firefoxNote.textContent =
      'If Plainview was installed manually, reload it once from chrome://extensions after changing permissions.';
  }

  document.querySelector('#settingsLink').addEventListener('click', (event) => {
    event.preventDefault();
    api.tabs.create({ url: api.runtime.getURL('src/options/options.html') });
  });

  let lastState = '';
  function setStatus(state, icon, title, hint) {
    accessState.dataset.state = state;
    accessIcon.textContent = icon;
    accessStatus.textContent = title;
    accessHint.textContent = hint;
  }

  function checkAccess() {
    const checker = api.extension?.isAllowedFileSchemeAccess;
    if (typeof checker !== 'function') {
      setStatus(
        'waiting',
        '!',
        'File access status is not exposed by this browser.',
        'Confirm access in the extension Details page.',
      );
      return;
    }

    checker((allowed) => {
      if (allowed) {
        if (lastState !== 'ready') {
          api.storage.local.set({ 'plainview-onboarding-complete': true });
        }
        lastState = 'ready';
        setStatus(
          'ready',
          '✓',
          'File access is enabled. You are all set.',
          'No further action is needed — close this tab and open a supported file.',
        );
        return;
      }

      lastState = 'waiting';
      setStatus(
        'waiting',
        '…',
        'Waiting for file access…',
        'Enable “Allow access to file URLs” in the extension Details page. This page will update automatically.',
      );
    });
  }

  const CheckIntervalMs = 4000;
  checkAccess();
  const timer = globalThis.setInterval(checkAccess, CheckIntervalMs);
  globalThis.addEventListener('pagehide', () => globalThis.clearInterval(timer), { once: true });
})();
