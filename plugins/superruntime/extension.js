// plugins/superruntime/extension.js
export const superruntime_extension = {
  name: "superruntime_extension",

  install(context) {
    let enabled = false;
    const eventListeners = new Map();
    
    // Start disabled and clean
    removeEventListeners();

    // Handle method calls
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

      if (!enabled || request.type !== "SUPER_RUNTIME_CALL") return false;

      const { requestId, methodName, args } = request;

      callChromeRuntime(methodName, args)
        .then(result => sendResponse({ success: true, result }))
        .catch(err => sendResponse({ success: false, error: err.message || String(err) }));

      return true;
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
        const listener = (...args) => broadcastRuntimeEvent(evtName, args);
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

async function broadcastRuntimeEvent(eventName, eventArgs) {
  if (!enabled) return; // Extra safety check
  
  try {
    const tabs = await chrome.tabs.query({
      status: "complete",
      url: ["http://*/*", "https://*/*"]
    });

    for (const tab of tabs) {
      // Skip tabs that can't receive messages
      if (!tab.id || tab.id < 0 || !tab.url || 
          tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://')) {
        continue;
      }

      try {
        // Add timeout to avoid hanging
        const response = await Promise.race([
          chrome.tabs.sendMessage(tab.id, {
            type: "SUPER_RUNTIME_EVENT",
            eventName,
            args: eventArgs
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        ]);

        if (!response?.success) {
          console.debug(`[superruntime] Tab ${tab.id} failed to handle message`);
        }
      } catch (err) {
        // Only log unexpected errors
        if (!err.message.includes('Could not establish connection') &&
            !err.message.includes('message port closed') &&
            !err.message.includes('Timeout')) {
          console.debug(`[superruntime] Tab ${tab.id} error:`, err.message);
        }
      }
    }
  } catch (err) {
    console.debug("[superruntime] Broadcast error:", err);
  }
}
