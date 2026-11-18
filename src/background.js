/* global chrome, browser */
/* Read the source document for the viewer. */
(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  if (api.action?.onClicked) {
    api.action.onClicked.addListener(() => {
      api.action.setBadgeText({ text: '' });
      api.runtime.openOptionsPage();
    });
  }

  async function requestSource(url) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    return response.ok ? response.text() : null;
  }

  function sameDocument(targetUrl, senderUrl) {
    try {
      const target = new URL(targetUrl);
      const sender = new URL(senderUrl);
      if (target.protocol === 'file:' || sender.protocol === 'file:') {
        return target.href === sender.href;
      }

      return target.origin === sender.origin;
    } catch {
      return false;
    }
  }

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const url = String(message?.url ?? '');
    const senderUrl = String(sender.tab?.url ?? sender.url ?? '');
    if (message?.type !== 'plainview:read-source' || !url) {
      return false;
    }

    if (!(/^(?:https?|file):/iu.test(url) && sameDocument(url, senderUrl))) {
      sendResponse({ text: null });
      return false;
    }

    requestSource(url).then(
      (text) => sendResponse({ text }),
      () => sendResponse({ text: null }),
    );
    return true;
  });
})();
