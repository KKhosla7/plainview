/* global chrome, browser */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const { userAgent } = navigator;
  const firefox = /Firefox/iu.test(userAgent);
  const edge = /Edg\//u.test(userAgent);
  const intro = document.querySelector('#intro');
  const steps = document.querySelector('#steps');
  const firefoxNote = document.querySelector('#firefoxNote');
  const status = document.querySelector('#status');
  const complete = document.querySelector('#complete');

  function addStep(title, body) {
    const item = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = title;
    item.append(strong, document.createTextNode(body));
    steps.append(item);
  }

  if (firefox) {
    intro.textContent =
      'Plainview is installed from Firefox Add-ons. Firefox needs file access enabled, and its built-in JSON viewer may take precedence for JSON responses.';
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
      'Plainview is installed from Microsoft Edge Add-ons. Edge needs file access enabled before it can render local files.';
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
      'Plainview is installed from the Chrome Web Store. Chrome needs file access enabled before it can render local files.';
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

  complete.addEventListener('click', () => {
    api.storage.local
      .set({ 'plainview-onboarding-complete': true })
      .then(() => {
        status.textContent =
          'Setup marked complete. Plainview will not show this guide automatically again.';
        status.classList.add('visible');
      })
      .catch(() => {
        status.textContent = 'Could not save setup status. Please try again.';
      });
  });
})();
