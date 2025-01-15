// plugins/superaction/extension.js
// Service worker bridging calls to chrome.action and broadcasting events.

export const superaction_extension = {
  name: "superaction_extension",

  install(context) {
    if (context.debug) {
      console.log("[superaction_extension] Installing superaction in SW...");
    }

    const CALL_TYPE = "SUPER_ACTION_CALL";
    const EVENT_TYPE = "SUPER_ACTION_EVENT";

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== CALL_TYPE) return false;

      const { requestId, methodName, args } = request;
      if (typeof chrome.action[methodName] !== "function") {
        sendResponse({
          success: false,
          error: `No such method: chrome.action.${methodName}`
        });
        return true;
      }

      try {
        const maybePromise = chrome.action[methodName](...args, (res) => {
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

    chrome.action.onClicked.addListener((tab) => {
      broadcast("onClicked", [ tab ]);
    });

    // optional: onUserSettingsChanged, etc.

    function broadcast(eventName, args) {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (t.id >= 0) {
            chrome.tabs.sendMessage(t.id, {
              type: EVENT_TYPE,
              eventName,
              args
            });
          }
        }
      });
    }
  }
};
