// plugins/superwebrequest/extension.js
// Minimal bridging for chrome.webRequest methods, e.g. handlerBehaviorChanged().

export const superwebrequest_extension = {
  name: "superwebrequest_extension",

  install(context) {
    let enabled = false;
    const eventListeners = new Map();

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

      if (!enabled || request.type !== "SUPER_WEBREQUEST_CALL") return false;

      const { requestId, methodName, args } = request;
      callChromeWebRequest(methodName, args)
        .then(result => sendResponse({ success: true, result }))
        .catch(err => sendResponse({ success: false, error: err.message || String(err) }));

      return true;
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
          if (enabled) broadcastWebRequestEvent(evtName, args);
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

    async function broadcastWebRequestEvent(eventName, eventArgs) {
      if (!enabled) return;
      
      try {
        const tabs = await chrome.tabs.query({
          status: "complete",
          url: ["http://*/*", "https://*/*"]
        });

        for (const tab of tabs) {
          if (!tab.id || tab.id < 0 || !tab.url || 
              tab.url.startsWith('chrome://') || 
              tab.url.startsWith('chrome-extension://')) {
            continue;
          }

          try {
            await Promise.race([
              chrome.tabs.sendMessage(tab.id, {
                type: "SUPER_WEBREQUEST_EVENT",
                eventName,
                args: eventArgs
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
            ]);
          } catch (err) {
            if (!err.message.includes('Could not establish connection') &&
                !err.message.includes('message port closed') &&
                !err.message.includes('Timeout')) {
              console.debug(`[superwebrequest] Tab ${tab.id} error:`, err.message);
            }
          }
        }
      } catch (err) {
        console.debug("[superwebrequest] Broadcast error:", err);
      }
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
