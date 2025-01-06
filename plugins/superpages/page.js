// plugins/superpages/page.js
(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  /**
   * Minimal "pages" method:
   * 1) Generate a requestId
   * 2) Listen for the "SUPERPAGES_RESPONSE" in the page
   * 3) Post the "SUPERPAGES" request to the content script
   */
  window.Superpowers.pages = function(content, options = {}) {
    const { filename, mimeType } = options; // optional arguments

    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(event) {
        if (!event.data || event.data.direction !== "from-content-script") return;
        if (event.data.type !== "SUPERPAGES_RESPONSE") return;
        if (event.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);

        if (event.data.success) {
          resolve(event.data.url);
        } else {
          reject(event.data.error || "Unknown SUPERPAGES error");
        }
      }

      window.addEventListener("message", handleResponse);

      // Send request to content script
      window.postMessage({
        direction: "from-page",
        type: "SUPERPAGES",
        requestId,
        content,
        filename,    // pass to content script
        mimeType     // pass to content script
      }, "*");
    });
  };
})();
