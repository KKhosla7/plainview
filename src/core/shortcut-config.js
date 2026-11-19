import { valueKind } from '../core/value.js';

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

const ALT_PREFIX_LENGTH = 4;

function matchesKey(event, binding) {
  if (!binding || binding === 'off' || !binding.startsWith('alt-')) {
    return false;
  }

  const key = binding.slice(ALT_PREFIX_LENGTH);
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

export const shortcutConfig = { Defaults, matchesKey, matchesView, normalizeShortcuts };
