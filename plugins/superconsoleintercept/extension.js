export const superconsoleintercept_extension = {
  name: "superconsoleintercept_extension",

  install(context) {
    const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";
    const CONTROL_EVENT_TYPE = "SUPER_CONSOLE_CONTROL";
    let enabled = false;

    if (context.debug) {
      console.log("[superconsoleintercept_extension] Installing console interceptor in SW...");
    }

    // Store original console methods in SW context
    const originalConsole = { ...console };
    let overriddenMethods = {};

    function setupConsoleOverrides() {
      ["log", "info", "warn", "error"].forEach((method) => {
        overriddenMethods[method] = (...args) => {
          // Call original
          originalConsole[method](...args);

          // Only broadcast if enabled
          if (enabled) {
            broadcastConsoleEvent(method, args);
          }
        };
        console[method] = overriddenMethods[method];
      });
    }

    function restoreConsole() {
      ["log", "info", "warn", "error"].forEach((method) => {
        console[method] = originalConsole[method];
      });
    }

    // Listen for console events and control messages
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === CONTROL_EVENT_TYPE) {
        if (message.action === 'turnOn') {
          enabled = true;
          setupConsoleOverrides();
        } else if (message.action === 'turnOff') {
          enabled = false;
          restoreConsole();
        }
        return;
      }

      if (message.type === PLUGIN_EVENT_TYPE && enabled) {
        broadcastConsoleEvent(message.level, message.args, sender.tab?.id);
      }
    });

    /**
     * Broadcast console event to all open tabs except excludeTabId
     */
    async function broadcastConsoleEvent(level, args, excludeTabId = null) {
      try {
        const tabs = await chrome.tabs.query({
          // Only target active tabs that can run content scripts
          active: true,
          status: "complete",
          url: ["http://*/*", "https://*/*"]
        });

        for (const tab of tabs) {
          if (typeof tab.id === "number" && 
              tab.id >= 0 && 
              tab.id !== excludeTabId &&
              !tab.url.startsWith("chrome://")) {
            
            try {
              await chrome.tabs.sendMessage(tab.id, {
                type: PLUGIN_EVENT_TYPE,
                level,
                args
              });
            } catch (err) {
              // Silently ignore connection errors
              if (!err.message.includes('Could not establish connection') &&
                  !err.message.includes('message port closed')) {
                originalConsole.debug(`[superconsoleintercept] Tab ${tab.id} error:`, err.message);
              }
            }
          }
        }
      } catch (err) {
        originalConsole.debug("[superconsoleintercept] Broadcast error:", err);
      }
    }

    // Start in disabled state
    restoreConsole();
  }
};
