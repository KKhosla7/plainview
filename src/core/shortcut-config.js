import { valueKind } from '.././core/value.js';

/* global Plainview */
/*
 * Keyboard shortcut defaults, presets and matching. The options page writes a
 * per-action object; older installs may still have a single view preset string.
 */
((root) => {
  const Defaults = Object.freeze({
    view: 'alt-s',
    theme: 'alt-t',
    contents: 'alt-c',
    search: 'alt-f',
    export: 'alt-e',
  });
  const ViewPresets = new Set(['alt-s', 'alt-arrows', 'ctrl-shift-arrows', 'off']);

  function stringOr(value, fallback) {
    return valueKind(value) === 'string' ? value : fallback;
  }

  function normalizeShortcuts(value) {
    if (valueKind(value) === 'string') {
      return { ...Defaults, view: ViewPresets.has(value) ? value : Defaults.view };
    }

    if (!value || valueKind(value) !== 'object' || Array.isArray(value)) {
      return { ...Defaults };
    }

    return {
      view: ViewPresets.has(value.view) ? value.view : Defaults.view,
      theme: stringOr(value.theme, Defaults.theme),
      contents: stringOr(value.contents, Defaults.contents),
      search: stringOr(value.search, Defaults.search),
      export: stringOr(value.export, Defaults.export),
    };
  }

  function matchesKey(event, binding) {
    if (!binding || binding === 'off' || !binding.startsWith('alt-')) {
      return false;
    }

    const key = binding.slice(4);
    return (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.key.toLowerCase() === key || event.code === `Key${key.toUpperCase()}`)
    );
  }

  function matchesView(event, binding) {
    if (binding === 'alt-s') {
      return matchesKey(event, 'alt-s');
    }

    if (binding === 'alt-arrows') {
      return (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      );
    }

    if (binding === 'ctrl-shift-arrows') {
      return (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      );
    }

    return false;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    shortcutConfig: {
      Defaults,
      matchesKey,
      matchesView,
      normalizeShortcuts,
    },
  });
})(globalThis);
