// plugins/superruntime/extension.js
export const superruntime_extension = {
  name: "superruntime_extension",

  install(context) {
    // Remove all debug logging

    // Handle method calls
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPER_RUNTIME_CALL") return false;

      const { requestId, methodName, args } = request;

      callChromeRuntime(methodName, args)
        .then(result => sendResponse({ success: true, result }))
        .catch(err => sendResponse({ success: false, error: err.message || String(err) }));

      return true;
    });

    // Setup runtime event listeners
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
      const evtObject = chrome.runtime[evtName];
      if (!evtObject || !evtObject.addListener) return;
      evtObject.addListener((...args) => {
        broadcastRuntimeEvent(evtName, args);
      });
    });
  }
};

/**
 * Attempt to call chrome.runtime[methodName](...args) as a Promise.
 * If the method doesn’t return a promise, fallback to old callback style.
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

function broadcastRuntimeEvent(eventName, eventArgs) {
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((t) => {
      if (t.id >= 0) {
        chrome.tabs.sendMessage(t.id, {
          type: "SUPER_RUNTIME_EVENT",
          eventName,
          args: eventArgs,
        });
      }
    });
  });
}
