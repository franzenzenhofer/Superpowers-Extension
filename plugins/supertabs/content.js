// plugins/supertabs/content.js
// Runs in the content-script context. Relays messages between page <-> service worker.
// 1) For calls from the page => send them to the SW.
// 2) For tab events from the SW => forward them to the page.

(function () {
  // console.log("[supertabs/content.js] loaded in content-script context");

  // Listen for messages from the **page** => pass them to the SW
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPER_TABS_CALL") return;

    const { requestId, methodName, args } = event.data;
    chrome.runtime.sendMessage(
      {
        type: "SUPER_TABS_CALL",
        requestId,
        methodName,
        args,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // SW might be sleeping or uninstalled
          window.postMessage(
            {
              direction: "from-content-script",
              type: "SUPER_TABS_RESPONSE",
              requestId,
              success: false,
              error: chrome.runtime.lastError.message,
            },
            "*"
          );
          return;
        }
        window.postMessage(
          {
            direction: "from-content-script",
            type: "SUPER_TABS_RESPONSE",
            requestId,
            success: response?.success,
            result: response?.result,
            error: response?.error,
          },
          "*"
        );
      }
    );
  });

  // Listen for messages from the **SW** => forward them to the page
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "SUPER_TABS_EVENT") {
      // e.g. { eventName: "onCreated", args: [tab] }
      window.postMessage(
        {
          direction: "from-content-script",
          type: "SUPER_TABS_EVENT",
          eventName: message.eventName,
          args: message.args,
        },
        "*"
      );
    }
  });
})();
