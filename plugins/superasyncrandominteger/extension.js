import { createExtensionBridge } from '/scripts/plugin_bridge.js';
import { generateRandomInteger } from "./superasyncrandominteger-lib.js";

export const superasyncrandominteger_extension = {
  name: "superasyncrandominteger_extension",

  install(context) {
    const methodHandlers = {
      // Handler for the 'generate' method from page.js
      generate: async (methodName, args, sender) => {
        const [timeMs, minVal, maxVal] = args; // Expect args in order
        // console.log(`[superasyncrandominteger_extension] Bridge Call: generate`, { timeMs, minVal, maxVal });
        
        // Call the async library function
        // The bridge automatically handles promise resolution/rejection
        return generateRandomInteger(timeMs, minVal, maxVal);
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superasyncrandominteger',
      methodHandlers,
    });

    /*
    console.log("[superasyncrandominteger_extension] Extension bridge initialized.");
    */
  }
};