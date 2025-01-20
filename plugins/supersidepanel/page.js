// plugins/supersidepanel/page.js
// Exposes `window.Superpowers.sidePanel` to in-page scripts, bridging calls
// (e.g. sidePanel.open(), sidePanel.setOptions(...)) through the content script
// to the extension's service worker.

(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  /**
   * Maps requestId -> { resolve, reject } so we can resolve Promises after
   * the service worker responds.
   * @type {Record<string, {resolve: Function, reject: Function}>}
   */
  const pendingRequests = {};

  /**
   * Tracks any event listeners. Currently, the sidePanel API doesn't provide
   * any events, but we keep this for consistency with your other “super” plugins.
   */
  const sidePanelEventListeners = {};

  // Listen for messages from content.js
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-content-script") {
      return;
    }

    const { type } = event.data;
    switch (type) {
      case "SUPER_SIDEPANEL_RESPONSE":
        handleSidePanelResponse(event.data);
        break;
      case "SUPER_SIDEPANEL_EVENT":
        handleSidePanelEvent(event.data);
        break;
      default:
        // Ignore unknown messages
        break;
    }
  });

  /**
   * Handles responses for method calls (e.g., sidePanel.open, sidePanel.getOptions, etc.).
   */
  function handleSidePanelResponse({ requestId, success, result, error }) {
    const callbackObj = pendingRequests[requestId];
    if (!callbackObj) return; // Possibly an outdated or unknown requestId

    delete pendingRequests[requestId];
    if (success) {
      callbackObj.resolve(result);
    } else {
      callbackObj.reject(error);
    }
  }

  /**
   * Handles a future event broadcast (none currently exist for sidePanel).
   */
  function handleSidePanelEvent({ eventName, args }) {
    const listeners = sidePanelEventListeners[eventName] || [];
    for (const fn of listeners) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[supersidepanel/page.js] Error in event '${eventName}':`, err);
      }
    }
  }

  /**
   * Sends a method invocation request to the content script.
   * @param {string} methodName e.g. "open", "setOptions"
   * @param {...any} args
   * @returns {Promise<any>}
   */
  function callMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      pendingRequests[requestId] = { resolve, reject };

      window.postMessage({
        direction: "from-page",
        type: "SUPER_SIDEPANEL_CALL",
        requestId,
        methodName,
        args,
      }, "*");
    });
  }

  // Optional event subscription, if the sidePanel API ever has events
  function on(eventName, callback) {
    if (!sidePanelEventListeners[eventName]) {
      sidePanelEventListeners[eventName] = [];
    }
    sidePanelEventListeners[eventName].push(callback);
  }

  // Optional event unsubscription
  function off(eventName, callback) {
    if (!sidePanelEventListeners[eventName]) return;
    sidePanelEventListeners[eventName] = sidePanelEventListeners[eventName].filter(
      (fn) => fn !== callback
    );
  }

  // Build a sidePanel proxy object, mirroring methods from the Chrome API:
  // - open(options)
  // - setOptions(options)
  // - getOptions(options)
  // - setPanelBehavior(behavior)
  // - getPanelBehavior()
  const sidePanelProxy = {
    on,
    off,

    open(options) {
      return callMethod("open", options);
    },
    setOptions(options) {
      return callMethod("setOptions", options);
    },
    getOptions(options) {
      return callMethod("getOptions", options);
    },
    setPanelBehavior(behavior) {
      return callMethod("setPanelBehavior", behavior);
    },
    getPanelBehavior() {
      return callMethod("getPanelBehavior");
    },
  };

  // Expose the proxy as part of Superpowers
  window.Superpowers.sidePanel = sidePanelProxy;

  // console.log("[supersidepanel/page.js] window.Superpowers.sidePanel is ready");
})();
