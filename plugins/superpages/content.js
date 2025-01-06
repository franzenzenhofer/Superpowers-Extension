// plugins/superpages/content.js
(function() {
  // Listen for messages from the real page
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERPAGES") return;

    const { requestId, content, filename, mimeType } = event.data;

    // Forward the request to the SW
    chrome.runtime.sendMessage({
      type: "SUPERPAGES",
      requestId,
      content,
      filename,
      mimeType
    }, (response) => {
      // Handle runtime errors
      if (chrome.runtime.lastError) {
        window.postMessage({
          direction: "from-content-script",
          type: "SUPERPAGES_RESPONSE",
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, "*");
        return;
      }

      // If no success in response => fail
      if (!response || !response.success) {
        const errMsg = response ? response.error : "No response from SW";
        window.postMessage({
          direction: "from-content-script",
          type: "SUPERPAGES_RESPONSE",
          requestId,
          success: false,
          error: errMsg
        }, "*");
        return;
      }

      // Otherwise, create the blob in the content script
      const type = mimeType || "text/html";
      const blob = new Blob([content], { type });
      const blobUrl = URL.createObjectURL(blob);

      // Send success back to the page
      window.postMessage({
        direction: "from-content-script",
        type: "SUPERPAGES_RESPONSE",
        requestId,
        success: true,
        url: blobUrl,
        filename // pass it back if needed
      }, "*");
    });
  });
})();
