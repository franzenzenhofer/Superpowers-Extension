import { createExtensionBridge } from '/scripts/plugin_bridge.js';
import { generatePingResponse } from "./superpingasync-lib.js";

export const superpingasync_extension = {
  name: "superpingasync_extension",

  install(context) {
    /*
    if (context.debug) {
      console.log("[superpingasync_extension] Installing bridge...");
    }
    */

    const methodHandlers = {
      // Handler for the 'ping' method from page.js
      ping: async (methodName, args, sender) => {
        const message = args[0]; // Expect message as first argument
        // console.log(`[superpingasync_extension] Bridge Call: ping`, message);
        
        // Simulate async work if needed (though bridge handles async naturally)
        // await new Promise(resolve => setTimeout(resolve, 0)); 
        
        // Generate response using the library function
        const result = generatePingResponse(message);
        return result; // Bridge sends { success: true, result: result }
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superpingasync',
      methodHandlers,
    });

    /*
    console.log("[superpingasync_extension] Extension bridge initialized.");
    */
  }
};