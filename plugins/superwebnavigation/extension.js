// plugins/superwebnavigation/extension.js
// Service worker bridging calls to chrome.webNavigation + broadcast events.

import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

export const superwebnavigation_extension = {
  name: "superwebnavigation_extension",

  install(context) {
    if (context.debug) {
      console.log("[superwebnavigation_extension] Installing superwebnavigation in SW...");
    }

    // Create the extension bridge with a handler for all webNavigation methods
    const { broadcastEvent } = createExtensionBridge({
      pluginName: 'superwebnavigation',
      methodHandlers: {
        // Handler for all webNavigation methods
        handler: (methodName, args, sender) => {
          if (typeof chrome.webNavigation[methodName] !== "function") {
            throw new Error(`No such method: chrome.webNavigation.${methodName}`);
          }

          return new Promise((resolve, reject) => {
            try {
              const maybePromise = chrome.webNavigation[methodName](...args, (res) => {
                const err = chrome.runtime.lastError;
                if (err) {
                  reject(new Error(err.message));
                } else {
                  resolve(res);
                }
              });
              if (maybePromise && typeof maybePromise.then === "function") {
                maybePromise.then(resolve).catch(reject);
              }
            } catch (err) {
              reject(err);
            }
          });
        }
      }
    });

    // Set up event listeners for webNavigation events to broadcast them
    const EVENTS = [
      "onBeforeNavigate",
      "onCommitted",
      "onDOMContentLoaded",
      "onCompleted",
      "onErrorOccurred"
    ];

    EVENTS.forEach((evtName) => {
      chrome.webNavigation[evtName].addListener((details) => {
        broadcastEvent(evtName, [details]);
      });
    });
  }
};
