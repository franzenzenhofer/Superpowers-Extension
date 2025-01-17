(function() {
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERURLGET_CALL") return;

    const { requestId, methodName, url, config } = event.data;

    chrome.runtime.sendMessage({
      type: "SUPERURLGET_CALL",
      requestId,
      methodName,
      url,
      config
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[superurlget/content.js] runtime.lastError:", chrome.runtime.lastError);
        window.postMessage({
          direction: "from-content-script",
          type: "SUPERURLGET_RESPONSE",
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, "*");
        return;
      }

      window.postMessage({
        direction: "from-content-script",
        type: "SUPERURLGET_RESPONSE",
        requestId,
        success: response?.success,
        result: response?.result,
        error: response?.error
      }, "*");
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SUPERURLGET_EVENT") {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPERURLGET_EVENT",
        eventName: message.eventName,
        args: message.args
      }, "*");
    }
  });
})();
