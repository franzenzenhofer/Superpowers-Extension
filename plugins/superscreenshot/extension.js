// plugins/superscreenshot/extension.js
// Minimal "superscreenshot" plugin in the service worker.
// Listens for "SUPERSCREENSHOT", calls doScreenshot() in an async style.

import { doScreenshot } from "./doScreenshot.js";

export const superscreenshot_extension = {
  name: "superscreenshot_extension",
  activeOperations: new Map(),

  install(context) {
    const { debug } = context;

    // Convert to non-async listener with Promise chains
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERSCREENSHOT") return false;

      const opId = request.requestId;
      console.log(`[superscreenshot_extension] Starting operation ${opId}`);

      // Keep service worker alive
      const keepAlive = setInterval(() => {
        try {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "SUPERSCREENSHOT_PROGRESS",
            operationId: opId,
            status: 'processing'
          });
        } catch (e) {
          console.warn('Keep-alive failed:', e);
        }
      }, 1000);

      // Use Promise chains instead of async/await
      doScreenshot(request.payload)
        .then(dataUrl => {
          clearInterval(keepAlive);
          return chrome.tabs.sendMessage(sender.tab.id, {
            type: "SUPERSCREENSHOT_RESULT",
            requestId: opId,
            success: true,
            result: dataUrl
          });
        })
        .catch(err => {
          clearInterval(keepAlive);
          console.error(`[superscreenshot_extension] Operation ${opId} failed:`, err);
          return chrome.tabs.sendMessage(sender.tab.id, {
            type: "SUPERSCREENSHOT_RESULT",
            requestId: opId,
            success: false,
            error: err.message
          });
        })
        .finally(() => {
          this.activeOperations.delete(opId);
        });

      // Immediate acknowledgment
      sendResponse({ 
        success: true, 
        status: 'processing',
        operationId: opId 
      });

      return true; // Keep channel open
    });

    // Status endpoint (also non-async)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SUPERSCREENSHOT_STATUS") {
        sendResponse({
          activeOperations: Array.from(this.activeOperations.entries())
        });
        return false;
      }
    });
  }
};
