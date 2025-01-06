import { generatePingResponse } from "./superpingasync-lib.js";

export const superpingasync_extension = {
  name: "superpingasync_extension",

  install(context) {
    if (context.debug) {
      console.log("[superpingasync_extension] Installing superpingasync in SW...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERASYNC_PING_CALL") return false;

      const { requestId, payload } = request;
      const { message } = payload || {};
      console.log(`[superpingasync_extension] #${requestId} => message: ${message}`);

      // Simulate async or do any needed logic before responding
      setTimeout(() => {
        sendResponse({
          success: true,
          result: generatePingResponse(message)
        });
      }, 0);

      return true; // Keep async channel open
    });
  }
};