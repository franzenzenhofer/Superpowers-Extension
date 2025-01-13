// plugins/supertabs/page.js
// Runs in the real page context, injecting an object `Superpowers.tabs`
// that allows both direct method calls (e.g. Superpowers.tabs.query(...))
// and event listeners (onCreated, onUpdated, etc).

(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Keep track of event listeners in an object of arrays
  const tabEventListeners = {
    // e.g. onCreated: [callback1, callback2...]
    // onUpdated: [], etc.
  };

  // Relay "SUPER_TABS_EVENT" from content.js => to local callbacks
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-content-script") return;
    if (event.data.type !== "SUPER_TABS_EVENT") return;

    const { eventName, args } = event.data;
    const callbacks = tabEventListeners[eventName] || [];
    callbacks.forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[supertabs/page.js] Error in event callback '${eventName}':`, err);
      }
    });
  });

  // Also relay "SUPER_TABS_RESPONSE" calls => used for method calls
  // We'll handle them in the promise below
  // (See the 'callMethod' function.)

  /**
   * A generic function to call any chrome.tabs method (e.g. "query", "create", "reload")
   */
  function callMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (
          !ev.data ||
          ev.data.direction !== "from-content-script" ||
          ev.data.type !== "SUPER_TABS_RESPONSE"
        )
          return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(ev.data.error || `Error calling chrome.tabs.${methodName}`);
        }
      }

      window.addEventListener("message", handleResponse);

      // Post to content script => which sends to SW
      window.postMessage(
        {
          direction: "from-page",
          type: "SUPER_TABS_CALL",
          requestId,
          methodName,
          args,
        },
        "*"
      );
    });
  }

  /**
   * Attach an event listener for tab events:
   * Superpowers.tabs.on("onCreated", (tab) => { ... })
   */
  function on(eventName, callback) {
    if (!tabEventListeners[eventName]) {
      tabEventListeners[eventName] = [];
    }
    tabEventListeners[eventName].push(callback);
  }

  /**
   * Detach a previously attached listener
   */
  function off(eventName, callback) {
    if (!tabEventListeners[eventName]) return;
    tabEventListeners[eventName] = tabEventListeners[eventName].filter(
      (fn) => fn !== callback
    );
  }

  /**
   * Provide an object that dynamically calls .callMethod(...) for anything
   *
   * e.g. Superpowers.tabs.query(...) => calls callMethod("query", {...}).
   */
  const tabsProxy = new Proxy({ on, off }, {
    get: (target, prop) => {
      // if user does Superpowers.tabs.on(...) or .off(...), return the real function
      if (prop === "on" || prop === "off") {
        return target[prop];
      }
      // else assume they want to call e.g. "query", "create", ...
      return (...args) => callMethod(prop, ...args);
    },
  });

  // Finally attach to window.Superpowers
  window.Superpowers.tabs = tabsProxy;

  // console.log("[supertabs/page.js] window.Superpowers.tabs is ready.");
})();
