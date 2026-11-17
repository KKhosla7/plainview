/* global Plainview */
((root) => {
  function createViewSwitcher({
    app,
    htmlTab,
    sourceTab,
    zoom,
    onSource,
    onViewChange,
    initialView = 'html',
    persistKey,
  }) {
    let view = initialView === 'source' ? 'source' : 'html';
    let htmlScroll = globalThis.scrollY;
    let sourceScroll = 0;

    function applyState() {
      const source = view === 'source';
      app.classList.toggle('pv-show-source', source);
      htmlTab.setAttribute('aria-selected', String(!source));
      sourceTab.setAttribute('aria-selected', String(source));
      zoom.setVisible(!source);
    }

    function setView(next, { persist = true } = {}) {
      if (next === view) {
        return;
      }

      if (view === 'html') {
        htmlScroll = globalThis.scrollY;
      } else {
        sourceScroll = globalThis.scrollY;
      }

      view = next;
      applyState();
      if (view === 'source' && onSource) {
        onSource();
      }
      Plainview.scrollToInstant(view === 'source' ? sourceScroll : htmlScroll);
      if (onViewChange) {
        onViewChange(view);
      }

      if (persist && persistKey) {
        Plainview.saveSetting(persistKey, view);
      }
    }

    function syncScroll(y) {
      if (view === 'html') {
        htmlScroll = y;
      } else {
        sourceScroll = y;
      }
    }

    applyState();

    htmlTab.addEventListener('click', () => setView('html'));
    sourceTab.addEventListener('click', () => setView('source'));

    return {
      setView,
      getView: () => view,
      syncScroll,
    };
  }

  root.Plainview = Object.assign(root.Plainview || {}, { createViewSwitcher });
})(globalThis);
