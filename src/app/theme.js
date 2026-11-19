import { createIconButton, icons } from '.././app/icons.js';
import { saveSetting, THEME_KEY, validTheme } from '../core/settings.js';

function createThemeButton() {
  return createIconButton(
    'pv-action pv-icon-action pv-theme-toggle',
    'Toggle theme',
    icons.theme(),
  );
}

function createTheme({ button, initialTheme }) {
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
    globalThis.document.documentElement.dataset.pvTheme = theme;
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.title = dark ? 'Dark theme · Switch to light' : 'Light theme · Switch to dark';
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

  button.addEventListener('click', () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  });

  apply();

  return {
    effectiveDark,
    toggle() {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    },
    setOnChange(fn) {
      onChange = fn;
    },
  };
}

export { createTheme, createThemeButton };
