// plugins/superdebug/extension.js (ES module)
import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

// We'll store logs in memory here. If you want to persist them (chrome.storage), you can.
const debugLogState = {
  logs: []
};

/**
 * Convert any object or value to a string for sidepanel logs.
 */
function toPrintable(value) {
  if (value == null) return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
}

export const superdebug_extension = {
  name: "superdebug_extension",

  install(context) {
    // console.log("[superdebug_extension] Installing in SW...");

    const methodHandlers = {
      // Handler for individual log entries sent from page.js
      log: async (methodName, args, sender) => {
        const logEntry = args[0]; // Expect the logEntry object
        logSingleEntry(logEntry, sender);
        // No return value needed (fire-and-forget)
      },
      
      // Optional handlers to track context enabling/disabling
      enableContext: async (methodName, args, sender) => {
          const tabId = sender?.tab?.id || 'N/A';
          const origin = sender?.origin || 'Unknown Origin';
          console.log(`%c[SuperDebug]%c Context ENABLED - ${origin} (Tab: ${tabId})`, 
                      'color: #28a745; font-weight: bold;', 'color: inherit;');
      },
      disableContext: async (methodName, args, sender) => {
          const tabId = sender?.tab?.id || 'N/A';
          const origin = sender?.origin || 'Unknown Origin';
          console.log(`%c[SuperDebug]%c Context DISABLED - ${origin} (Tab: ${tabId})`, 
                      'color: #dc3545; font-weight: bold;', 'color: inherit;');
      }
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superdebug',
      methodHandlers,
    });

    /*
    console.log("[superdebug_extension] Extension bridge initialized.");
    */
  },

  uninstall(context) {
    // console.log("[superdebug_extension] Uninstalling from SW...");
  }
};

function logSingleEntry(logEntry, sender) {
  if (!logEntry || typeof logEntry !== 'object') {
      console.warn("[superdebug_extension] Invalid log entry received:", logEntry);
      return;
  }

  const { timestamp, url, args } = logEntry;
  const tabId = sender?.tab?.id || 'N/A';
  const origin = sender?.origin || url || 'Unknown Origin'; // Use logEntry URL as fallback

  // Format the output nicely
  console.groupCollapsed(
    `%c[SuperDebug]%c [${timestamp || new Date().toISOString()}] - ${origin} (Tab: ${tabId})`, // Add default timestamp
    'color: #007bff; font-weight: bold;', // Style for prefix
    'color: inherit; font-weight: normal;' // Style for rest of the title
  );

  if (Array.isArray(args)) {
    // Use console.log for potentially complex objects within args
    args.forEach((arg, index) => {
      console.log(arg); // Log each argument directly
    });
  } else {
    console.log("Data:", args); // Fallback if args isn't an array
  }

  console.groupEnd();
}
