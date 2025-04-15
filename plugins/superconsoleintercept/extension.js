import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

export const superconsoleintercept_extension = {
  name: "superconsoleintercept_extension",

  install(context) {
    let broadcastingEnabled = false; // Is the SW allowed to broadcast events?
    let bridgeInstance = null; // To store the bridge instance for broadcasting

    const methodHandlers = {
      // Handler for enable command from page script
      enable: async (methodName, args, sender) => {
        console.log('[superconsoleintercept_extension] Broadcasting ENABLED.');
        broadcastingEnabled = true;
        return { status: 'enabled' };
      },

      // Handler for disable command from page script
      disable: async (methodName, args, sender) => {
        console.log('[superconsoleintercept_extension] Broadcasting DISABLED.');
        broadcastingEnabled = false;
        return { status: 'disabled' };
      },

      // Handler for log events sent *from* a page script
      logEvent: async (methodName, args, sender) => {
        if (!broadcastingEnabled) {
          // If broadcasting is off in the SW, just ignore the incoming event
          return { status: 'ignored_broadcasting_disabled' };
        }

        const level = args[0];
        const logArgs = args[1];
        const senderTabId = sender?.tab?.id;

        if (!bridgeInstance) {
           console.error('[superconsoleintercept_extension] Bridge not initialized, cannot broadcast.');
           return { status: 'ignored_bridge_not_ready' };
        }

        // Use the bridge's broadcast function.
        // It handles querying tabs and sending messages.
        // We send the original level, args, and the sender tab ID.
        bridgeInstance.broadcastEvent('CONSOLE_EVENT', { 
            level: level, 
            args: logArgs, 
            sourceTabId: senderTabId 
        });

        return { status: 'broadcasted' }; // Acknowledge the event was processed
      }
    };

    // Create the extension bridge
    // Store the instance so we can call broadcastEvent from the handler
    bridgeInstance = createExtensionBridge({
      pluginName: 'superconsoleintercept',
      methodHandlers,
    });

    /*
    console.log("[superconsoleintercept_extension] Extension bridge initialized.");
    */

    // The SW no longer needs to intercept its own console or manually broadcast.
    // The old listeners are replaced by the bridge handlers.
  }
};
