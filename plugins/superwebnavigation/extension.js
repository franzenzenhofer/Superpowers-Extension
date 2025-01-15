// plugins/superwebnavigation/extension.js
// Service worker bridging calls to chrome.webNavigation + broadcast events.

export const superwebnavigation_extension = {
  name: "superwebnavigation_extension",

  install(context) {
    const PLUGIN_CALL_TYPE = "SUPER_WEBNAVIGATION_CALL";
    const PLUGIN_EVENT_TYPE = "SUPER_WEBNAVIGATION_EVENT";

    if (context.debug) {
      console.log("[superwebnavigation_extension] Installing superwebnavigation in SW...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== PLUGIN_CALL_TYPE) return false;

      const { requestId, methodName, args } = request;
      if (typeof chrome.webNavigation[methodName] !== "function") {
        sendResponse({ success: false, error: `No such method: chrome.webNavigation.${methodName}` });
        return true;
      }

      try {
        const maybePromise = chrome.webNavigation[methodName](...args, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            sendResponse({ success: false, error: err.message });
          } else {
            sendResponse({ success: true, result: res });
          }
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then((res) => {
            sendResponse({ success: true, result: res });
          }).catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
          return true;
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    });

    // pick webNavigation events to broadcast
    const EVENTS = [
      "onBeforeNavigate",
      "onCommitted",
      "onDOMContentLoaded",
      "onCompleted",
      "onErrorOccurred"
    ];

    EVENTS.forEach((evtName) => {
      chrome.webNavigation[evtName].addListener((details) => {
        broadcast(evtName, details);
      });
    });

    function broadcast(eventName, details) {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (t.id >= 0) {
            chrome.tabs.sendMessage(t.id, {
              type: PLUGIN_EVENT_TYPE,
              eventName,
              args: [details]
            });
          }
        }
      });
    }
  }
};
