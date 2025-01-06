// plugins/superasyncrandominteger/content.js

(function () {
  console.log("[superpingasync/content.js] loaded in content-script context");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERASYNC_PING_CALL") return;

    const { requestId, payload } = event.data;
    chrome.runtime.sendMessage(
      {
        type: "SUPERASYNC_PING_CALL",
        requestId,
        payload
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            direction: "from-content-script",
            type: "SUPERASYNC_PING_RESPONSE",
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }

        window.postMessage({
          direction: "from-content-script",
          type: "SUPERASYNC_PING_RESPONSE",
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });
})();