const ThemeKey = 'plainview.theme';
const LegacyKey = 'plainview-options-theme';
const root = document.documentElement;
const button = document.querySelector('.page-theme-toggle');
const media = globalThis.matchMedia('(prefers-color-scheme: dark)');
const api = globalThis.browser ?? globalThis.chrome;
const storage = api?.storage?.local ?? null;

function validTheme(value) {
  return value === 'light' || value === 'dark' ? value : null;
}

async function loadTheme() {
  if (storage) {
    const data = await storage.get(ThemeKey);
    const stored = validTheme(data?.[ThemeKey]);
    if (stored) {
      return stored;
    }
  }

  return validTheme(localStorage.getItem(LegacyKey));
}

function saveTheme(theme) {
  if (storage) {
    storage.set({ [ThemeKey]: theme });
  }
  localStorage.setItem(LegacyKey, theme);
}

if (button) {
  let theme = media.matches ? 'dark' : 'light';

  function apply() {
    root.dataset.pvPageTheme = theme;
    const dark = theme === 'dark';
    button.title = dark ? 'Dark theme · Switch to light' : 'Light theme · Switch to dark';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(dark));
  }

  apply();

  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
    apply();
  });

  api?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes?.[ThemeKey]) {
      return;
    }

    const next = validTheme(changes[ThemeKey].newValue);
    if (next && next !== theme) {
      theme = next;
      apply();
    }
  });

  const stored = await loadTheme();
  if (stored) {
    theme = stored;
    saveTheme(stored);
    apply();
  }
}
