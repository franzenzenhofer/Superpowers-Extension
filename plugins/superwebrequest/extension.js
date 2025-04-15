// plugins/superwebrequest/extension.js
// Minimal bridging for chrome.webRequest methods, e.g. handlerBehaviorChanged().

import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

export const superwebrequest_extension = {
  name: "superwebrequest_extension",

  install(context) {
    let enabled = false;
    const eventListeners = new Map();

    // Create the extension bridge with a handler for all webRequest methods
    const { broadcastEvent } = createExtensionBridge({
      pluginName: 'superwebrequest',
      methodHandlers: {
        // Handler for all webRequest methods
        handler: (methodName, args, sender) => {
          if (!enabled) {
            throw new Error("Superwebrequest is not enabled");
          }
          return callChromeWebRequest(methodName, args);
        }
      }
    });

    // Handle control messages for enabling/disabling
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUPER_WEBREQUEST_CONTROL") {
        if (request.action === "turnOn") {
          enabled = true;
          setupEventListeners();
        } else if (request.action === "turnOff") {
          enabled = false;
          removeEventListeners();
        }
        sendResponse({ success: true });
        return true;
      }
      return false;
    });

    function setupEventListeners() {
      const webRequestEvents = [
        'onBeforeRequest',
        'onBeforeSendHeaders',
        'onSendHeaders',
        'onHeadersReceived',
        'onAuthRequired',
        'onResponseStarted',
        'onBeforeRedirect',
        'onCompleted',
        'onErrorOccurred'
      ];

      webRequestEvents.forEach(evtName => {
        const listener = (...args) => {
          if (enabled) {
            broadcastEvent(evtName, args);
          }
        };
        eventListeners.set(evtName, listener);
        
        const evtObject = chrome.webRequest[evtName];
        if (evtObject?.addListener) {
          evtObject.addListener(listener, { urls: ["<all_urls>"] });
        }
      });
    }

    function removeEventListeners() {
      eventListeners.forEach((listener, evtName) => {
        const evtObject = chrome.webRequest[evtName];
        if (evtObject?.removeListener) {
          evtObject.removeListener(listener);
        }
      });
      eventListeners.clear();
    }

    // Start completely disabled
    enabled = false;
    removeEventListeners();
  }
};

/**
 * Attempt to call chrome.webRequest[methodName](...args) as a promise.
 * Currently, the main method is "handlerBehaviorChanged", but this
 * generic approach allows any future methods to be called in the same way.
 */
function callChromeWebRequest(methodName, args = []) {
  return new Promise((resolve, reject) => {
    if (typeof chrome.webRequest[methodName] !== "function") {
      return reject(new Error(`No such method: chrome.webRequest.${methodName}`));
    }

    let maybePromise;
    try {
      // Attempt the modern promise-based usage (Chrome 116+ for handlerBehaviorChanged).
      maybePromise = chrome.webRequest[methodName](...args);
    } catch (err) {
      return reject(err);
    }

    // If the call returned a promise, await it; otherwise fallback to a callback
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve, reject);
    } else {
      // Old callback style
      try {
        chrome.webRequest[methodName](...args, (res) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
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
