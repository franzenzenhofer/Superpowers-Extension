export const superreadme_extension = {
  name: "superreadme_extension",

  install(context) {
    if (context.debug) {
      console.log("[superreadme_extension] Installing superreadme plugin...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERREADME_CALL") return false;

      const { methodName } = request.payload;
      
      const filename = methodName === "getLLMReadme" ? "README-LLM.md" :
                      methodName === "getMainReadme" ? "README.md" : null;

      if (!filename) {
        sendResponse({
          success: false,
          error: `Invalid method: ${methodName}`
        });
        return false;
      }

      // Get extension's URL for the README file
      const fileUrl = chrome.runtime.getURL(filename);

      // Use async fetch with proper error handling
      (async () => {
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
          }
          const text = await response.text();
          sendResponse({
            success: true,
            result: text
          });
        } catch (error) {
          console.error("[superreadme_extension] Error:", error);
          sendResponse({
            success: false,
            error: error.message || String(error)
          });
        }
      })();

      return true; // Async response
    });
  }
};