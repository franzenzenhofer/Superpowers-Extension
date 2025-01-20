// plugins/supersidepanel/content.js
// Bridges the page.js with the extension's service worker, using
// runtime.sendMessage() and window.postMessage().

(function () {
  // Listen for messages from page.js
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPER_SIDEPANEL_CALL") return;

    const { requestId, methodName, args } = event.data;

    // Forward to the service worker
    chrome.runtime.sendMessage(
      {
        type: "SUPER_SIDEPANEL_CALL",
        requestId,
        methodName,
        args,
      },
      (response) => {
        // If extension is unavailable or times out, we might have lastError
        if (chrome.runtime.lastError) {
          console.error("[supersidepanel/content.js] runtime.lastError:", chrome.runtime.lastError);
          sendResponseToPage(requestId, false, null, chrome.runtime.lastError.message);
          return;
        }
        // Otherwise, pass along the service worker's response
        sendResponseToPage(requestId, response?.success, response?.result, response?.error);
      }
    );
  });

  // If the service worker wanted to broadcast an event, it would do so here
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SUPER_SIDEPANEL_EVENT") {
      // Forward that to page.js
      window.postMessage({
        direction: "from-content-script",
        type: "SUPER_SIDEPANEL_EVENT",
        eventName: message.eventName,
        args: message.args,
      }, "*");
    }
  });

  /**
   * Sends a "SUPER_SIDEPANEL_RESPONSE" message back to page.js
   */
  function sendResponseToPage(requestId, success, result, error) {
    window.postMessage({
      direction: "from-content-script",
      type: "SUPER_SIDEPANEL_RESPONSE",
      requestId,
      success,
      result,
      error,
    }, "*");
  }
})();
