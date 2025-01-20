export const superconsoleintercept_extension = {
  name: "superconsoleintercept_extension",

  install(context) {
    const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";

    if (context.debug) {
      console.log("[superconsoleintercept_extension] Installing console interceptor in SW...");
    }

    // Store original console methods in SW context
    const originalConsole = { ...console };

    // Override SW console methods
    ["log", "info", "warn", "error"].forEach((method) => {
      console[method] = (...args) => {
        // Call original
        originalConsole[method](...args);

        // Broadcast to all tabs
        broadcastConsoleEvent(method, args);
      };
    });

    // Listen for console events from content scripts
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type !== PLUGIN_EVENT_TYPE) return;
      
      // Broadcast to all other tabs
      broadcastConsoleEvent(message.level, message.args, sender.tab?.id);
    });

    /**
     * Broadcast console event to all open tabs except excludeTabId
     */
    function broadcastConsoleEvent(level, args, excludeTabId = null) {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          // tab.id can be -1 or undefined for some special pages
          if (typeof tab.id === "number" && tab.id >= 0 && tab.id !== excludeTabId) {
            // Use the callback form to catch errors from tabs that
            // do not have a listening content script.
            chrome.tabs.sendMessage(tab.id, {
              type: PLUGIN_EVENT_TYPE,
              level,
              args
            }, () => {
              // If there's an error, just ignore it to avoid spamming logs.
              if (chrome.runtime.lastError) {
                // Optionally log it if you want to see it in SW:
                // originalConsole.warn("Could not send message to tab", tab.id, chrome.runtime.lastError.message);
              }
            });
          }
        }
      });
    }
  }
};
