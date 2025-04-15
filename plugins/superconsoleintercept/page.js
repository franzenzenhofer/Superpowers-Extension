import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  // Store original console methods safely
  const originalConsole = { ...console };
  window._originalConsole = originalConsole; // Keep for potential emergency recovery

  // State
  let interceptionEnabled = false; // Is the console overridden?
  // Transmission control might still be useful locally if needed, 
  // but the primary enable/disable is handled via bridge calls.
  let transmissionEnabled = true; // Default to transmitting if intercepted

  // Instantiate the bridge
  const consoleBridge = createPageBridge('superconsoleintercept');

  // --- Public API --- 
  const consoleAPI = {
    // Use bridge's event handling for incoming logs from other contexts
    on(callback) { // Simplified: only one event type 'CONSOLE_EVENT' expected
      consoleBridge.on('CONSOLE_EVENT', callback);
    },
    off(callback) {
      consoleBridge.off('CONSOLE_EVENT', callback);
    },
    // onAll is just multiple calls to on
    onAll(callback) {
       this.on(callback); 
    },

    // Control interception via bridge calls
    async turnOn() {
      try {
        await consoleBridge.enable(); // Tell SW to start broadcasting
        setupConsoleOverrides();
        interceptionEnabled = true;
        originalConsole.log('[Superpowers.console] Interception enabled.');
      } catch (err) {
        originalConsole.error('[Superpowers.console] Failed to enable interception:', err);
      }
    },
    async turnOff() {
      try {
        await consoleBridge.disable(); // Tell SW to stop broadcasting
        restoreOriginalConsole();
        interceptionEnabled = false;
        originalConsole.log('[Superpowers.console] Interception disabled.');
      } catch (err) {
        originalConsole.error('[Superpowers.console] Failed to disable interception:', err);
      }
    },

    // Local transmission control (optional, independent of SW broadcasting)
    turnTransmissionOn() {
      transmissionEnabled = true;
      originalConsole.log('[Superpowers.console] Local transmission ON.');
    },
    turnTransmissionOff() {
      transmissionEnabled = false;
      originalConsole.log('[Superpowers.console] Local transmission OFF.');
    }
  };

  window.Superpowers.console = consoleAPI;

  // --- Internal Functions --- 

  function setupConsoleOverrides() {
    if (interceptionEnabled) return; // Prevent multiple overrides

    ["log", "info", "warn", "error"].forEach((method) => {
      console[method] = (...args) => {
        // 1. Always call the original method
        originalConsole[method]?.(...args);

        // 2. If enabled and transmission is on, send log via bridge to SW
        if (interceptionEnabled && transmissionEnabled) {
          // Use bridge to send the log event *to* the service worker.
          // SW will decide whether to broadcast it back out.
          // We use fire-and-forget style here; no need to await.
          consoleBridge.logEvent(method, args).catch(err => {
             originalConsole.error('[Superpowers.console] Error sending log event via bridge:', err);
          });
        }
      };
    });
  }

  function restoreOriginalConsole() {
    if (!interceptionEnabled) return;
    ["log", "info", "warn", "error"].forEach((method) => {
      if (originalConsole[method]) {
        console[method] = originalConsole[method];
      }
    });
  }

  // Remove the old message listener; bridge handles incoming events via .on()

})();
