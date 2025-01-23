// plugins/superruntime/content.js
(function() {
  let enabled = false;

  // Handle control messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SUPER_RUNTIME_CONTROL") {
      enabled = message.action === "turnOn";
      sendResponse({ success: true });
      return true;
    }

    if (!enabled) {
      sendResponse({ success: false });
      return true;
    }

    if (message.type === "SUPER_RUNTIME_EVENT") {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPER_RUNTIME_EVENT",
        eventName: message.eventName,
        args: message.args
      }, "*");
      sendResponse({ success: true });
      return true;
    }
    
    return false;
  });

  // Remove initial loaded message

  // Relay messages from the page => background
  window.addEventListener("message", (ev) => {
    if (!enabled) return;
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
})();
