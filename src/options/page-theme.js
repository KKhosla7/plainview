/* global window */
(() => {
  const Key = 'plainview-options-theme';
  const root = document.documentElement;
  const button = document.querySelector('.page-theme-toggle');
  if (!button) {
    return;
  }

  const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = localStorage.getItem(Key) || (prefersDark ? 'dark' : 'light');

  function apply() {
    root.dataset.pvPageTheme = theme;
    const dark = theme === 'dark';
    button.textContent = dark ? '☀' : '☾';
    button.title = dark ? 'Dark theme · Switch to light' : 'Light theme · Switch to dark';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(dark));
  }

  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(Key, theme);
    apply();
  });
  apply();
})();
