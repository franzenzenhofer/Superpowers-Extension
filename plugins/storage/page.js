// plugins/storage/page.js
// Exposes `window.Superpowers.storage` to page scripts, bridging calls/events
// between the real web page and the extension via content.js.

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  const pendingRequests = {};
  const storageEventListeners = {};
  let isInitialized = false;

  function init() {
    if (isInitialized) return;

    try {
      setupMessageHandlers();
      setupStorageAPI();
      isInitialized = true;
    } catch (err) {
      console.error('[storage/page.js] Initialization error:', err);
    }
  }

  function setupMessageHandlers() {
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-content-script") return;

      switch (event.data.type) {
        case "SUPER_STORAGE_RESPONSE":
          handleStorageResponse(event.data);
          break;
        case "SUPER_STORAGE_EVENT":
          handleStorageEvent(event.data);
          break;
      }
    });
  }

  function handleStorageResponse({ requestId, success, result, error }) {
    const pending = pendingRequests[requestId];
    if (!pending) return;

    delete pendingRequests[requestId];
    if (success) {
      pending.resolve(result);
    } else {
      pending.reject(new Error(error));
    }
  }

  function handleStorageEvent({ eventName, args }) {
    const listeners = storageEventListeners[eventName] || [];
    listeners.forEach(fn => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[storage/page.js] Event listener error:`, err);
      }
    });
  }

  function callStorage(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      pendingRequests[requestId] = { resolve, reject };

      try {
        window.postMessage({
          direction: "from-page",
          type: "SUPER_STORAGE_CALL",
          requestId,
          methodName,
          args
        }, "*");
      } catch (err) {
        delete pendingRequests[requestId];
        reject(new Error("Failed to send storage request: " + err.message));
      }

      // Cleanup hanging requests after timeout
      setTimeout(() => {
        if (pendingRequests[requestId]) {
          delete pendingRequests[requestId];
          reject(new Error(`Storage request timeout: ${methodName}`));
        }
      }, 30000);
    });
  }

  function setupStorageAPI() {
    const storageAPI = {
      on: (eventName, callback) => {
        if (!storageEventListeners[eventName]) {
          storageEventListeners[eventName] = [];
        }
        storageEventListeners[eventName].push(callback);
      },
      off: (eventName, callback) => {
        if (!storageEventListeners[eventName]) return;
        storageEventListeners[eventName] = storageEventListeners[eventName]
          .filter(fn => fn !== callback);
      }
    };

    // Add storage areas
    ['local', 'sync', 'managed', 'session'].forEach(area => {
      storageAPI[area] = new Proxy({}, {
        get: (_, method) => (...args) => callStorage(`${area}.${method}`, ...args)
      });
    });

    window.Superpowers.storage = storageAPI;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
