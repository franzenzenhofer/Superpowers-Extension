// plugins/superping/extension.js
// Minimal "ping" plugin in the service worker.
// Listens for the "SUPERPING" message and simply logs/echoes it (no real return needed).

import { createExtensionBridge } from '/scripts/plugin_bridge.js';

export const superping_extension = {
  name: "superping_extension",

  /**
   * Called by plugin_manager.js to install the plugin in the SW context.
   */
  install(context) {
    /*
    if (context.debug) {
      console.log("[superping_extension] Installing bridge...");
    }
    */

    const methodHandlers = {
      // Handler for the 'ping' method from the (now async) page.js
      ping: async (methodName, args, sender) => {
        const msg = args[0]; // The message payload
        // console.log(`[superping_extension] Bridge Call: ping`, msg);
        
        // Just acknowledge receipt. The bridge sends { success: true, result: ... }
        return { received: msg }; // Or simply return true or undefined
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superping',
      methodHandlers,
    });

    /*
    console.log("[superping_extension] Extension bridge initialized.");
    */
  }
};
