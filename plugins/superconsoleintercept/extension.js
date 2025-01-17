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

    function broadcastConsoleEvent(level, args, excludeTabId = null) {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id >= 0 && tab.id !== excludeTabId) {
            chrome.tabs.sendMessage(tab.id, {
              type: PLUGIN_EVENT_TYPE,
              level,
              args
            }).catch(() => {}); // Ignore disconnected tabs
          }
        }
      });
    }
  }
};
