// plugins/superruntime/content.js
(function() {
  // console.log("[superruntime/content.js] loaded in content-script context");

  // Relay messages from the page => background
  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== "SUPER_RUNTIME_CALL") return;

    const { requestId, methodName, args } = ev.data;
    // console.log("[superruntime/content.js] SUPER_RUNTIME_CALL =>", methodName, args);

    chrome.runtime.sendMessage(
      {
        type: "SUPER_RUNTIME_CALL",
        requestId,
        methodName,
        args
      },
      function(response) {
        if (chrome.runtime.lastError) {
          console.error("[superruntime/content.js] runtime.lastError:", chrome.runtime.lastError);
          window.postMessage({
            direction: "from-content-script",
            type: "SUPER_RUNTIME_RESPONSE",
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }

        // Forward the response back to the page
        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_RUNTIME_RESPONSE",
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });

  // Add event listener for runtime events from service worker
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "SUPER_RUNTIME_EVENT") {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPER_RUNTIME_EVENT",
        eventName: message.eventName,
        args: message.args
      }, "*");
    }
  });
})();
