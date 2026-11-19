export function focusSnapshot() {
  const element = document.activeElement;
  if (!element || element === document.body) {
    return null;
  }

  return {
    end: element.selectionEnd,
    label: element.getAttribute('aria-label'),
    scroll: globalThis.scrollY,
    start: element.selectionStart,
    tag: element.tagName,
  };
}

export function restoreFocus(snapshot) {
  if (!snapshot) {
    return;
  }

  globalThis.requestAnimationFrame(() => {
    globalThis.scrollTo(0, snapshot.scroll);
    if (!snapshot.label) {
      return;
    }
    const target = [...document.querySelectorAll(snapshot.tag.toLowerCase())].find(
      (element) => element.getAttribute('aria-label') === snapshot.label,
    );
    if (!target) {
      return;
    }
    target.focus();
    if (snapshot.start !== null && snapshot.end !== null) {
      target.setSelectionRange(snapshot.start, snapshot.end);
    }
  });
}
