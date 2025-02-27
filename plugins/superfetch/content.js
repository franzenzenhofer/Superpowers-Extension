// plugins/superfetch/content.js
// Bridges page <-> SW. We mainly just forward the request with
// { url, options } to the SW, and listen for the response.

(function() {
  window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
      if (event.data.type !== "SUPERFETCH") return;

      const { requestId, url, options } = event.data;
      // Forward to the SW
      chrome.runtime.sendMessage(
          {
              type: "SUPERFETCH",
              url,
              options,
              requestId
          },
          (response) => {
              // If extension is unavailable or times out
              if (chrome.runtime.lastError) {
                  sendPageResponse(requestId, {
                      success: false,
                      error: chrome.runtime.lastError.message
                  });
                  return;
              }

              sendPageResponse(requestId, {
                  success: response?.success,
                  status: response?.status,
                  statusText: response?.statusText,
                  body: response?.body,
                  rawData: response?.rawData,    // pass ArrayBuffer from extension to page
                  headers: response?.headers,
                  redirected: response?.redirected,
                  url: response?.url,
                  type: "SUPERFETCH_RESPONSE"
              });
          }
      );
  });

  function sendPageResponse(requestId, response) {
      const message = {
          direction: "from-content-script",
          type: "SUPERFETCH_RESPONSE",
          requestId,
          ...response
      };
      window.postMessage(message, "*");
  }
})();
