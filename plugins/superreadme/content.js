(function() {
  console.log("[superreadme/content.js] Loaded in content-script context");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERREADME_CALL") return;

    const { requestId, payload } = event.data;
    const { methodName } = payload || {};

    // Check if method is valid
    if (!["getLLMReadme", "getMainReadme"].includes(methodName)) {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPERREADME_RESPONSE",
        requestId,
        success: false,
        error: `Invalid method: ${methodName}`
      }, "*");
      return;
    }

    chrome.runtime.sendMessage({
      type: "SUPERREADME_CALL",
      requestId,
      payload: { methodName }
    }, response => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          direction: "from-content-script",
          type: "SUPERREADME_RESPONSE",
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, "*");
        return;
      }

      window.postMessage({
        direction: "from-content-script",
        type: "SUPERREADME_RESPONSE",
        requestId,
        success: response?.success,
        result: response?.result,
        error: response?.error
      }, "*");
    });
  });
})();
