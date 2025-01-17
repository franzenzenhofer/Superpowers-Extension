(function() {
  if (!window.Superpowers) window.Superpowers = {};

  const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";
  const eventListeners = new Map();

  // Listen for console events from content script
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
    }
  };

  window.Superpowers.console = consoleAPI;

  // Store original methods and override console
  window._originalConsole = { ...console };
  ["log", "info", "warn", "error"].forEach((method) => {
    console[method] = (...args) => {
      // Call original
      window._originalConsole[method](...args);
      
      // Notify content script
      window.postMessage({
        direction: "from-page",
        type: PLUGIN_EVENT_TYPE,
        level: method,
        args: args
      }, "*");
    };
  });
})();
