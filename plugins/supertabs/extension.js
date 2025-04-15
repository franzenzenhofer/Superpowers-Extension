// plugins/supertabs/extension.js
// Runs in the service worker (MV3). Bridges all chrome.tabs.* methods
// and broadcasts tab events back to each content script (so the page sees them).

import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

export const supertabs_extension = {
  name: "supertabs_extension",

  install(context) {
    if (context.debug) {
      console.log("[supertabs_extension] Installing supertabs in SW...");
    }

    // Create the extension bridge with a handler for all methods
    const { broadcastEvent } = createExtensionBridge({
      pluginName: 'supertabs',
      methodHandlers: {
        // Handler for all tab methods
        handler: (methodName, args, sender) => {
          return callChromeTabs(methodName, args);
        }
      }
    });

    // Set up event listeners for tab events to broadcast them
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
      const evtObject = chrome.tabs[evtName];
      if (!evtObject || !evtObject.addListener) return; // skip unsupported
      evtObject.addListener((...args) => {
        broadcastEvent(evtName, args);
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
