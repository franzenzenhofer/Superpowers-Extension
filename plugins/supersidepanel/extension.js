// plugins/supersidepanel/extension.js
// The service worker bridging for chrome.sidePanel. Receives calls from content.js,
// calls the sidePanel API, and sends back results. Currently, sidePanel does not
// have any events, but we keep the structure for future expansion.

export const supersidepanel_extension = {
  name: "supersidepanel_extension",

  install(context) {
    // Listen for method calls from content.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPER_SIDEPANEL_CALL") return false;

      const { requestId, methodName, args } = request;
      callChromeSidePanel(methodName, args)
        .then((result) => sendResponse({ success: true, result }))
        .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));

      return true; // Must return true to keep sendResponse alive asynchronously
    });

    // If we ever need to broadcast events (none exist yet), we could do so here.
  }
};

/**
 * Calls the appropriate chrome.sidePanel method by name:
 *  "open", "setOptions", "getOptions", "setPanelBehavior", "getPanelBehavior"
 * We'll try promise-based usage first, fallback to callback if needed.
 */
function callChromeSidePanel(methodName, args = []) {
  return new Promise((resolve, reject) => {
    const sidePanelAPI = chrome.sidePanel;
    if (!sidePanelAPI) {
      return reject(new Error("chrome.sidePanel is not available in this browser version."));
    }

    if (typeof sidePanelAPI[methodName] !== "function") {
      return reject(new Error(`No such method: chrome.sidePanel.${methodName}`));
    }

    let maybePromise;
    try {
      // Attempt modern promise usage
      maybePromise = sidePanelAPI[methodName](...args);
    } catch (err) {
      return reject(err);
    }

    if (maybePromise && typeof maybePromise.then === "function") {
      // If we got a Promise, resolve it
      maybePromise.then(resolve, reject);
    } else {
      // Fallback callback usage (some older builds might not fully support promises)
      try {
        sidePanelAPI[methodName](...args, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
          } else {
            resolve(res);
          }
        });
      } catch (cbErr) {
        reject(cbErr);
      }
    }
  });
}

/**
 * If sidePanel ever had an event to broadcast, you'd do something like:
 *   function broadcastSidePanelEvent(eventName, eventArgs) {
 *     chrome.tabs.query({}, (tabs) => {
 *       tabs.forEach((tab) => {
 *         if (tab.id >= 0) {
 *           chrome.tabs.sendMessage(tab.id, {
 *             type: "SUPER_SIDEPANEL_EVENT",
 *             eventName,
 *             args: eventArgs
 *           });
 *         }
 *       });
 *     });
 *   }
 * Currently unused.
 */
