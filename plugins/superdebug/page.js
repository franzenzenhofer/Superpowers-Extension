// plugins/superdebug/page.js
import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }
  // console.log("[superdebug/page.js] loaded in page context");

  // Store original console if needed elsewhere
  if (!window._originalConsole) {
      window._originalConsole = { ...console };
  }

  // Instantiate the bridge
  const debugBridge = createPageBridge('superdebug');

  // --- State (still managed locally for enable/disable) ---
  let _isEnabled = false; 

  /**
   * Safely convert any input (object, array, etc.) into a readable string.
   */
  function toPrintable(value) {
    if (value == null) return String(value); // e.g. "null" or "undefined"
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (err) {
        return String(value); // fallback
      }
    }
    // For everything else (string, number, boolean), just cast to string
    return String(value);
  }

  // --- Core Logging Function --- 
  window.Superpowers.debugLog = function(...args) {
    if (!_isEnabled) {
      return; // Do nothing if disabled locally
    }

    // Attempt serialization (same logic as before)
    let serializedArgs = [];
    try {
      serializedArgs = args.map(arg => JSON.parse(JSON.stringify(arg, safeReplacer())));
    } catch (e) {
      serializedArgs = args.map(arg => {
        if (typeof arg === 'function') return '[Function]';
        if (arg instanceof Error) return `[Error: ${arg.message}]`;
        return String(arg);
      });
      window._originalConsole?.warn?.('[Superpowers.debugLog] Serialization fallback:', e, args);
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      args: serializedArgs
    };

    // Send immediately via bridge - no buffering/throttling on page side
    // Use fire-and-forget style
    debugBridge.log(logEntry).catch(err => {
      window._originalConsole?.error?.('[Superpowers.debugLog] Bridge call failed:', err);
    });
  };

  // --- Control Functions --- 
  // Enable/disable locally AND notify the bridge/SW if needed
  window.Superpowers.debugLog.enable = async () => {
    _isEnabled = true;
    try {
        // Optional: Notify SW that this specific page context is enabling logs
        await debugBridge.enableContext(); 
        window._originalConsole?.log?.('[Superpowers.debugLog] Enabled.');
    } catch (err) {
        window._originalConsole?.error?.('[Superpowers.debugLog] Failed to notify bridge on enable:', err);
    }
  };

  window.Superpowers.debugLog.disable = async () => {
    _isEnabled = false;
    try {
        // Optional: Notify SW that this specific page context is disabling logs
        await debugBridge.disableContext(); 
        window._originalConsole?.log?.('[Superpowers.debugLog] Disabled.');
    } catch (err) {
        window._originalConsole?.error?.('[Superpowers.debugLog] Failed to notify bridge on disable:', err);
    }
  };

  // --- Serialization Helper (remains the same) ---
  function safeReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      if (typeof value === 'bigint') {
          return value.toString() + 'n';
      }
      return value;
    };
  }

  // Old buffering/throttling logic removed.
})();
