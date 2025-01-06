// plugins/superwebrequest/extension.js
// Minimal bridging for chrome.webRequest methods, e.g. handlerBehaviorChanged().

export const superwebrequest_extension = {
  name: "superwebrequest_extension",

  install(context) {
    if (context.debug) {
      console.log("[superwebrequest_extension] Installing superwebrequest in SW...");
    }

    // 1) Listen for "SUPER_WEBREQUEST_CALL" messages from content.js => page.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPER_WEBREQUEST_CALL") return false;

      const { requestId, methodName, args } = request;
      console.log(`[superwebrequest_extension] method=${methodName}, requestId=${requestId}`);

      callChromeWebRequest(methodName, args)
        .then(result => sendResponse({ success: true, result }))
        .catch(err => sendResponse({ success: false, error: err.message || String(err) }));

      return true; // indicates async response
    });

    // Setup webRequest event listeners
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
      const evtObject = chrome.webRequest[evtName];
      if (!evtObject || !evtObject.addListener) return;
      evtObject.addListener((...args) => {
        broadcastWebRequestEvent(evtName, args);
      }, { urls: ["<all_urls>"] });
    });
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

function broadcastWebRequestEvent(eventName, eventArgs) {
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((t) => {
      if (t.id >= 0) {
        chrome.tabs.sendMessage(t.id, {
          type: "SUPER_WEBREQUEST_EVENT",
          eventName,
          args: eventArgs,
        });
      }
    });
  });
}
