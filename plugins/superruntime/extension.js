// plugins/superruntime/extension.js
import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

export const superruntime_extension = {
  name: "superruntime_extension",

  install(context) {
    let enabled = false;
    const eventListeners = new Map();
    
    // Start disabled and clean
    removeEventListeners();

    // Create the extension bridge with a handler for all methods
    const { broadcastEvent } = createExtensionBridge({
      pluginName: 'superruntime',
      methodHandlers: {
        // Handler for all runtime methods
        handler: (methodName, args, sender) => {
          if (!enabled) {
            throw new Error("Superruntime is not enabled");
          }
          return callChromeRuntime(methodName, args);
        }
      }
    });

    // Handle control messages for enabling/disabling
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUPER_RUNTIME_CONTROL") {
        if (request.action === "turnOn") {
          enabled = true;
          setupEventListeners();
        } else if (request.action === "turnOff") {
          enabled = false;
          removeEventListeners();
        }
        return;
      }
    });

    function setupEventListeners() {
      const runtimeEvents = [
        'onStartup',
        'onInstalled',
        'onSuspend',
        'onSuspendCanceled',
        'onUpdateAvailable',
        'onBrowserUpdateAvailable',
        'onConnect',
        'onConnectExternal',
        'onMessage',
        'onMessageExternal'
      ];

      runtimeEvents.forEach(evtName => {
        const listener = (...args) => {
          if (enabled) {
            broadcastEvent(evtName, args);
          }
        };
        eventListeners.set(evtName, listener);
        
        const evtObject = chrome.runtime[evtName];
        if (evtObject?.addListener) {
          evtObject.addListener(listener);
        }
      });
    }

    function removeEventListeners() {
      eventListeners.forEach((listener, evtName) => {
        const evtObject = chrome.runtime[evtName];
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
 * Attempt to call chrome.runtime[methodName](...args) as a Promise.
 * If the method doesn't return a promise, fallback to old callback style.
 */
function callChromeRuntime(methodName, args) {
  return new Promise((resolve, reject) => {
    if (typeof chrome.runtime[methodName] !== "function") {
      return reject(new Error(`No such method: chrome.runtime.${methodName}`));
    }

    let maybePromise;
    try {
      // Try modern MV3 promise approach first:
      maybePromise = chrome.runtime[methodName](...args);
    } catch (err) {
      return reject(err);
    }

    // If returned object is a Promise, wait on it:
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve, reject);
    } else {
      // Fallback to callback-based approach
      try {
        chrome.runtime[methodName](...args, (result) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
          } else {
            resolve(result);
          }
        });
      } catch (cbErr) {
        reject(cbErr);
      }
    }
  });
}
