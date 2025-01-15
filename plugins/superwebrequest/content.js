// plugins/superwebrequest/content.js
// Minimal bridging from the page => SW (service worker), exactly like superruntime.

(function() {
  // console.log("[superwebrequest/content.js] loaded in content-script context");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPER_WEBREQUEST_CALL") return;

    const { requestId, methodName, args } = event.data;
    // console.log("[superwebrequest/content.js] SUPER_WEBREQUEST_CALL =>", methodName, args);

    chrome.runtime.sendMessage(
      {
        type: "SUPER_WEBREQUEST_CALL",
        requestId,
        methodName,
        args
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[superwebrequest/content.js] runtime.lastError:", chrome.runtime.lastError);
          window.postMessage({
            direction: "from-content-script",
            type: "SUPER_WEBREQUEST_RESPONSE",
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }
        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_WEBREQUEST_RESPONSE",
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "SUPER_WEBREQUEST_EVENT") {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPER_WEBREQUEST_EVENT",
        eventName: message.eventName,
        args: message.args
      }, "*");
    }
  });
})();
