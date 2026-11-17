/* global Plainview */
((root) => {
  function createTheme({ lightButton, darkButton, initialTheme }) {
    const { THEME_KEY, saveSetting, validTheme } = Plainview;
    const stored = validTheme(initialTheme);
    let theme =
      stored || (globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    let onChange = null;

    function effectiveDark() {
      if (theme === 'dark') {
        return true;
      }

      if (theme === 'light') {
        return false;
      }

      return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function apply() {
      root.document.documentElement.dataset.pvTheme = theme;
      for (const [name, button] of [
        ['light', lightButton],
        ['dark', darkButton],
      ]) {
        const selected = theme === name;
        button.setAttribute('aria-selected', String(selected));
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      }
    }

    function setTheme(next) {
      if (next === theme) {
        return;
      }
      theme = next;
      saveSetting(THEME_KEY, theme);
      apply();
      if (onChange) {
        onChange();
      }
    }

    lightButton.addEventListener('click', () => setTheme('light'));
    darkButton.addEventListener('click', () => setTheme('dark'));

    apply();

    return {
      effectiveDark,
      setOnChange(fn) {
        onChange = fn;
      },
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createTheme });
})(globalThis);
