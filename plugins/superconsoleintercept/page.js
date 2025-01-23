(function() {
  if (!window.Superpowers) window.Superpowers = {};

  const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";
  const eventListeners = new Map();

  // Add enabled state (dormant by default)
  let enabled = false;
  let transmissionEnabled = false;

  function turnOn() {
    enabled = true;
    setupConsoleOverrides();
    // Notify SW to turn on
    chrome.runtime.sendMessage({
      type: "SUPER_CONSOLE_CONTROL",
      action: "turnOn"
    });
  }

  function turnOff() {
    enabled = false;
    // Restore original console methods
    ["log", "info", "warn", "error"].forEach((method) => {
      console[method] = window._originalConsole[method];
    });
    // Notify SW to turn off
    chrome.runtime.sendMessage({
      type: "SUPER_CONSOLE_CONTROL",
      action: "turnOff"
    });
  }

  function turnTransmissionOn() {
    transmissionEnabled = true;
  }

  function turnTransmissionOff() {
    transmissionEnabled = false;
  }

  // Expose on Superpowers.console
  const consoleAPI = {
    on(level, callback) {
      if (!eventListeners.has(level)) {
        eventListeners.set(level, new Set());
      }
      eventListeners.get(level).add(callback);
    },

    off(level, callback) {
      const listeners = eventListeners.get(level);
      if (listeners) {
        listeners.delete(callback);
      }
    },

    onAll(callback) {
      ["log", "info", "warn", "error"].forEach(level => {
        this.on(level, callback);
      });
    },

    turnOn,
    turnOff,
    turnTransmissionOn,
    turnTransmissionOff
  };

  window.Superpowers.console = consoleAPI;

  // Store original console methods
  window._originalConsole = { ...console };

  function setupConsoleOverrides() {
    ["log", "info", "warn", "error"].forEach((method) => {
      console[method] = (...args) => {
        // Always call the original console method
        window._originalConsole[method](...args);

        // Only forward if enabled and transmission is on
        if (enabled && transmissionEnabled) {
          window.postMessage({
            direction: "from-page",
            type: PLUGIN_EVENT_TYPE,
            level: method,
            args: args
          }, "*");
        }
      };
    });
  }

  // Only set up message listener if enabled
  window.addEventListener("message", (ev) => {
    if (!enabled) return;
    if (!ev.data || ev.data.direction !== "from-content-script") return;
    if (ev.data.type !== PLUGIN_EVENT_TYPE) return;

    const { level, args } = ev.data;
    const listeners = eventListeners.get(level) || [];
    listeners.forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        // Use original console to avoid infinite loops
        window._originalConsole?.error?.("[superconsoleintercept] Error in listener:", err);
      }
    });
  });
})();
