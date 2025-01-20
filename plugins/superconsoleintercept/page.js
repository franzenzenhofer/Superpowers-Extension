(function() {
  if (!window.Superpowers) window.Superpowers = {};

  const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";
  const eventListeners = new Map();

  // ---------------------------------------------------------------------------------
  // 1) Transmission flag and turnTransmissionOn / turnTransmissionOff
  // ---------------------------------------------------------------------------------
  let transmissionEnabled = false;

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

    turnTransmissionOn,
    turnTransmissionOff
  };

  window.Superpowers.console = consoleAPI;

  // ---------------------------------------------------------------------------------
  // 2) Listen for console events from content script (which might come from the SW)
  // ---------------------------------------------------------------------------------
  window.addEventListener("message", (ev) => {
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

  // ---------------------------------------------------------------------------------
  // 3) Override console methods on the page
  // ---------------------------------------------------------------------------------
  window._originalConsole = { ...console };

  ["log", "info", "warn", "error"].forEach((method) => {
    console[method] = (...args) => {
      // Always call the original console method
      window._originalConsole[method](...args);

      // Only forward to content script if transmission is enabled
      if (transmissionEnabled) {
        window.postMessage({
          direction: "from-page",
          type: PLUGIN_EVENT_TYPE,
          level: method,
          args: args
        }, "*");
      }
    };
  });
})();
