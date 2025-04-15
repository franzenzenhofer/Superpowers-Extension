// plugins/superscreenshot/extension.js
// Minimal "superscreenshot" plugin in the service worker.
// Listens for "SUPERSCREENSHOT", calls doScreenshot() in an async style.

import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

import { doScreenshot } from "./doScreenshot.js";

export const superscreenshot_extension = {
  name: "superscreenshot_extension",
  // activeOperations: new Map(), // No longer needed with bridge handling requests individually

  install(context) {
    const methodHandlers = {
      // Handler for the main screenshot capture call
      capture: async (methodName, args, sender, requestId) => {
        const payload = args[0] || {}; // Expect config payload as first arg
        // console.log(`[superscreenshot_extension] Bridge Call: capture (requestId: ${requestId})`, payload);
        
        // No need for manual keep-alive, the bridge handles timeouts.
        // If doScreenshot provided progress, we would use broadcastEvent here.

        try {
          const dataUrl = await doScreenshot(payload);
          // console.log(`[superscreenshot_extension] Success (requestId: ${requestId})`);
          return dataUrl; // Bridge sends this back as { success: true, result: dataUrl }
        } catch (err) {
          console.error(`[superscreenshot_extension] Failure (requestId: ${requestId}):`, err);
          // Re-throw the error so the bridge sends { success: false, error: err.message }
          throw err;
        }
      },

      // Handler for the status request (if still needed)
      // Note: This simple version doesn't track active operations like the old one.
      // If detailed status is required, state management would need to be added here.
      getStatus: async (methodName, args) => {
         // console.log(`[superscreenshot_extension] Bridge Call: getStatus`);
        // Return simple status or empty object, as bridge handles requests individually.
        return { status: "ready", active_operations_count: 0 }; 
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superscreenshot',
      methodHandlers,
    });

    /*
    console.log("[superscreenshot_extension] Extension bridge initialized.");
    */

    // Old onMessage listeners are replaced by the bridge
  }
};
