import { createExtensionBridge } from '/scripts/plugin_bridge.js';

export const superreadme_extension = {
  name: "superreadme_extension",

  install(context) {
    /*
    if (context.debug) {
      console.log("[superreadme_extension] Installing bridge...");
    }
    */

    // Helper function to fetch a readme file
    async function fetchReadme(filename) {
      if (!filename) {
        throw new Error("Invalid filename requested.");
      }
      const fileUrl = chrome.runtime.getURL(filename);
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: HTTP ${response.status} - ${response.statusText}`);
        }
        return await response.text();
      } catch (error) {
        console.error(`[superreadme_extension] Error fetching ${filename}:`, error);
        // Re-throw to be caught by the bridge handler
        throw new Error(`Failed to fetch ${filename}: ${error.message || String(error)}`);
      }
    }

    const methodHandlers = {
      // Handler for getLLMReadme method
      getLLMReadme: async (methodName, args, sender) => {
        return fetchReadme("README-LLM.md");
      },
      
      // Handler for getMainReadme method
      getMainReadme: async (methodName, args, sender) => {
        return fetchReadme("README.md");
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superreadme',
      methodHandlers,
    });

    /*
    console.log("[superreadme_extension] Extension bridge initialized.");
    */
  }
};