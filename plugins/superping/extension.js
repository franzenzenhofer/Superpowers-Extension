// plugins/superping/extension.js
// Minimal "ping" plugin in the service worker.
// Listens for the "SUPERPING" message and simply logs/echoes it (no real return needed).

export const superping_extension = {
  name: "superping_extension",

  /**
   * Called by plugin_manager.js to install the plugin in the SW context.
   */
  install(context) {
    if (context.debug) {
      console.log("[superping_extension] Installing Superping in SW...");
    }

    /**
     * Listen for messages of type "SUPERPING".
     * We'll just log them to console and respond success: true.
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERPING") return false;

      console.log("[superping_extension] Got SUPERPING =>", request.payload);

      // Minimal synchronous response (in MV3, it's still callback-based),
      // but from the page's perspective, it's a "fire and forget".
      sendResponse({ success: true });

      // Must return true to indicate async or possible delayed response
      return true;
    });
  }
};
