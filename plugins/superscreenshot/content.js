(function() {
  // console.log("[superscreenshot/content.js] loaded in content-script context");

  const operations = new Map();

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERSCREENSHOT") return;

    const { requestId, payload } = event.data;
    operations.set(requestId, { startTime: Date.now() });

    // Send message to service worker
    chrome.runtime.sendMessage(
      { type: "SUPERSCREENSHOT", requestId, payload },
      function(response) {
        if (chrome.runtime.lastError) {
          console.error("[superscreenshot/content.js] Error:", chrome.runtime.lastError);
          notifyPage(requestId, false, null, chrome.runtime.lastError.message);
          operations.delete(requestId);
          return;
        }

        // Only store operation info if it's still ongoing
        if (response?.operationId) {
          const operation = operations.get(requestId);
          if (operation) {
            operation.operationId = response.operationId;
          }
        }
      }
    );
  });

  // Handle messages from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.type?.startsWith("SUPERSCREENSHOT_")) return false;

    switch (message.type) {
      case "SUPERSCREENSHOT_PROGRESS":
        window.postMessage({
          direction: "from-content-script",
          type: "SUPERSCREENSHOT_PROGRESS",
          requestId: message.operationId,
          status: message.status
        }, "*");
        sendResponse({ received: true });
        break;

      case "SUPERSCREENSHOT_RESULT":
        notifyPage(message.requestId, message.success, message.result, message.error);
        operations.delete(message.requestId);
        sendResponse({ received: true });
        break;
    }

    return false; // Not async
  });

  function notifyPage(requestId, success, result, error) {
    window.postMessage({
      direction: "from-content-script",
      type: "SUPERSCREENSHOT_RESPONSE",
      requestId,
      success,
      result,
      error
    }, "*");
  }
})();