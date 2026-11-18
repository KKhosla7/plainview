/* global chrome, browser */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const firefox = /Firefox/iu.test(navigator.userAgent);
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
      'Plainview can read supported files in Firefox. Its built-in JSON viewer may take precedence for JSON responses.';
    addStep(
      'Allow file access:',
      'Open about:addons, select Plainview, open Permissions, and allow access to file URLs.',
    );
    addStep(
      'Open a local file:',
      'Use Ctrl+O / Cmd+O or drag a Markdown, YAML, TOML, CSV, XML or log file into Firefox.',
    );
    addStep('Test it:', 'If the rendered Plainview reader appears, setup is complete.');
    firefoxNote.hidden = false;
    firefoxNote.textContent =
      'Firefox limitation: Firefox may render JSON with its own viewer before Plainview can take over. Markdown and other supported formats should still open in Plainview.';
  } else {
    intro.textContent = 'Chrome needs file access enabled before Plainview can render local files.';
    addStep(
      'Open extensions:',
      'Go to chrome://extensions and enable Developer mode if Plainview is loaded unpacked.',
    );
    addStep('Allow file URLs:', 'Open Plainview → Details and enable “Allow access to file URLs”.');
    addStep(
      'Reload the extension:',
      'Click the reload button on the Plainview card after changing permissions.',
    );
    addStep(
      'Test it:',
      'Open a local Markdown, JSON, YAML, TOML, CSV, XML or log file. Plainview should replace the raw text view.',
    );
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
