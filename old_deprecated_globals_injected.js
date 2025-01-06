// globals_injected.js
// Runs in the real page context. We define superfetch (and superEnv if desired) so that
// the page can call them, even though we cannot directly use chrome.runtime here.
//
// We do so by sending a "SUPERFETCH_PAGE_REQUEST" event to the content script, which *does*
// have chrome.runtime. The content script then relays to the extension's background worker.

(function () {
  console.log("[globals_injected.js] Setting up superfetch bridging...");

  // This dictionary stores the ongoing requests by requestId
  const pendingRequests = {};

  // Called by the page to do a superfetch
  window.superfetch = function (url, options = {}) {
    return new Promise((resolve, reject) => {
      // Generate a requestId to correlate request/response
      const requestId = Math.random().toString(36).slice(2);

      // Store callbacks so when content script replies, we can resolve/reject
      pendingRequests[requestId] = { resolve, reject };

      // Send a message to the content script
      window.postMessage({
        direction: "from-page",
        type: "SUPERFETCH_PAGE_REQUEST",
        requestId,
        url,
        options
      }, "*");
    });
  };

  // If you also want superEnv, do bridging the same way:
  window.superEnv = {
    async getVars() {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).slice(2);
        pendingRequests[requestId] = { resolve, reject };
        window.postMessage({
          direction: "from-page",
          type: "SUPERENV_GET_VARS",
          requestId
        }, "*");
      });
    },
    async setVars(obj) {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).slice(2);
        pendingRequests[requestId] = { resolve, reject };
        window.postMessage({
          direction: "from-page",
          type: "SUPERENV_SET_VARS",
          requestId,
          vars: obj
        }, "*");
      });
    }
  };

  // Listen for the content script's response message
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-content-script") return;

    const { requestId, success, result, error } = event.data;
    const pending = pendingRequests[requestId];
    if (!pending) return; // unknown or old requestId

    if (success) {
      pending.resolve(result);
    } else {
      pending.reject(error);
    }
    delete pendingRequests[requestId];
  });

  console.log("[globals_injected.js] superfetch & superEnv bridging set up");
})();
