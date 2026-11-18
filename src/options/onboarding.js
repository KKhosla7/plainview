/* global chrome, browser */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const { userAgent } = navigator;
  const firefox = /Firefox/iu.test(userAgent);
  const edge = /Edg\//u.test(userAgent);
  const intro = document.querySelector('#intro');
  const steps = document.querySelector('#steps');
  const firefoxNote = document.querySelector('#firefoxNote');
  const accessStatus = document.querySelector('#accessStatus');
  const accessHint = document.querySelector('#accessHint');
  const recheck = document.querySelector('#recheck');

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

  function checkAccess() {
    accessStatus.textContent = 'Checking file access…';
    accessHint.textContent = '';
    const checker = api.extension?.isAllowedFileSchemeAccess;
    if (typeof checker !== 'function') {
      accessStatus.textContent =
        'This browser does not expose file-access status. Confirm access in the extension’s Details page.';
      accessHint.textContent =
        'If local files still open as raw text, enable file URL access and reload the extension.';
      return;
    }

    checker((allowed) => {
      if (allowed) {
        accessStatus.textContent = 'File access is enabled. Plainview is ready for local files.';
        accessHint.textContent = 'You can close this tab and start opening supported files.';
        api.storage.local.set({ 'plainview-onboarding-complete': true });
        return;
      }

      accessStatus.textContent = 'File access is currently disabled.';
      accessHint.textContent =
        'Enable “Allow access to file URLs” in the extension Details page, then check again.';
    });
  }

  recheck.addEventListener('click', checkAccess);
  checkAccess();
})();
