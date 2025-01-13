// plugins/supertabs/extension.js
// Runs in the service worker (MV3). Bridges all chrome.tabs.* methods
// and broadcasts tab events back to each content script (so the page sees them).

export const supertabs_extension = {
  name: "supertabs_extension",

  install(context) {
    if (context.debug) {
      console.log("[supertabs_extension] Installing supertabs in SW...");
    }

    // 1) Listen for calls from content script => “SUPER_TABS_CALL”
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPER_TABS_CALL") return false;

      const { requestId, methodName, args } = request;
      // console.log(`[supertabs_extension] method=${methodName}, requestId=${requestId}`);

      // Attempt to call chrome.tabs[methodName]
      callChromeTabs(methodName, args)
        .then((result) => {
          sendResponse({ success: true, result });
        })
        .catch((err) => {
          console.error("[supertabs_extension] callChromeTabs error:", err);
          sendResponse({ success: false, error: err.message || String(err) });
        });

      return true; // async
    });

    // 2) Forward events from chrome.tabs.* to all tabs, so content.js => page
    const tabEvents = [
      "onCreated",
      "onUpdated",
      "onRemoved",
      "onActivated",
      "onAttached",
      "onDetached",
      "onHighlighted",
      "onMoved",
      "onReplaced",
      "onZoomChange",
    ];

    tabEvents.forEach((evtName) => {
      // e.g. chrome.tabs.onCreated.addListener(...)
      // must do dynamic: chrome.tabs[evtName].addListener(...)
      const evtObject = chrome.tabs[evtName];
      if (!evtObject || !evtObject.addListener) return; // skip unsupported
      evtObject.addListener((...args) => {
        broadcastTabEvent(evtName, args);
      });
    });
  },
};

/**
 * Utility to call chrome.tabs[methodName](...args) either as a Promise
 * (if supported) or via callback fallback.
 */
function callChromeTabs(methodName, args) {
  return new Promise((resolve, reject) => {
    const method = chrome.tabs[methodName];
    if (typeof method !== "function") {
      return reject(new Error(`No such method: chrome.tabs.${methodName}`));
    }

    // Try promise-based usage
    try {
      const maybePromise = method(...args);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve, reject);
      } else {
        // fallback for older callback style
        method(...args, (result) => {
          const err = chrome.runtime.lastError;
          if (err) {
            return reject(new Error(err.message));
          }
          resolve(result);
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Broadcast a tab event to **all** tabs (so each content script can pass it to page).
 */
function broadcastTabEvent(eventName, eventArgs) {
  // We can do chrome.tabs.query({}) to find all tabs, then send a message to each
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((t) => {
      if (t.id >= 0) {
        chrome.tabs.sendMessage(t.id, {
          type: "SUPER_TABS_EVENT",
          eventName,
          args: eventArgs,
        });
      }
    });
  });
}
