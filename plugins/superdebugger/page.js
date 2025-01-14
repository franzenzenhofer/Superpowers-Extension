// plugins/superdebugger/page.js
// Minimal bridging from the real page => content => SW for chrome.debugger API

/**
 * Immediately invoked function to set up the debugger bridge
 * Includes comprehensive error checking and state validation
 */
(function() {
  // Validate extension environment
  if (typeof window === 'undefined') {
    throw new Error('[superdebugger/page.js] Window object not available');
  }

  // Initialize Superpowers namespace with validation
  if (!window.Superpowers) {
    Object.defineProperty(window, 'Superpowers', {
      value: {},
      writable: false,
      configurable: false
    });
  } else if (window.Superpowers.debugger) {
    console.warn('[superdebugger/page.js] Debugger interface already initialized');
    return;
  }

  const STATE = {
    initialized: false,
    eventListenersActive: false
  };

  const debuggerEventListeners = new Map();
  const VALID_EVENTS = new Set(['onDetach', 'onEvent']);

  /**
   * Validates event name before registration
   * @param {string} eventName - Name of the event to validate
   * @throws {Error} If event name is invalid
   */
  function validateEventName(eventName) {
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('[superdebugger/page.js] Invalid event name');
    }
    if (!VALID_EVENTS.has(eventName)) {
      throw new Error(`[superdebugger/page.js] Unsupported event: ${eventName}`);
    }
  }

  /**
   * Validates callback function
   * @param {Function} callback - Callback to validate
   * @throws {Error} If callback is invalid
   */
  function validateCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('[superdebugger/page.js] Callback must be a function');
    }
  }

  // Set up message listener with error boundary
  window.addEventListener("message", (event) => {
    try {
      if (!event || !event.data) return;
      if (event.data.direction !== "from-content-script") return;
      
      if (event.data.type === "SUPER_DEBUGGER_EVENT") {
        const { eventName, args } = event.data;
        
        // Validate event data
        if (!eventName || !VALID_EVENTS.has(eventName)) {
          console.error(`[superdebugger/page.js] Invalid event received: ${eventName}`);
          return;
        }

        const callbacks = debuggerEventListeners.get(eventName) || [];
        callbacks.forEach((fn) => {
          try {
            fn(...(Array.isArray(args) ? args : []));
          } catch (err) {
            console.error(`[superdebugger/page.js] Error in event callback '${eventName}':`, err);
          }
        });
      }
    } catch (err) {
      console.error('[superdebugger/page.js] Error processing message:', err);
    }
  });

  /**
   * Calls a chrome.debugger method through the messaging system
   * @param {string} methodName - Name of the method to call
   * @param {...any} args - Arguments for the method
   * @returns {Promise<any>} - Result of the method call
   */
  function callMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      // Validate method name
      if (!methodName || typeof methodName !== 'string') {
        reject(new Error('[superdebugger/page.js] Invalid method name'));
        return;
      }

      // Validate state
      if (!STATE.initialized) {
        reject(new Error('[superdebugger/page.js] Debugger interface not initialized'));
        return;
      }

      const requestId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      let timeoutId;

      function handleResponse(ev) {
        try {
          if (!ev.data || ev.data.direction !== "from-content-script" || 
              ev.data.type !== "SUPER_DEBUGGER_RESPONSE") return;
          if (ev.data.requestId !== requestId) return;

          clearTimeout(timeoutId);
          window.removeEventListener("message", handleResponse);

          if (ev.data.success) {
            resolve(ev.data.result);
          } else {
            reject(new Error(ev.data.error || `Error calling chrome.debugger.${methodName}`));
          }
        } catch (err) {
          reject(new Error(`[superdebugger/page.js] Error processing response: ${err.message}`));
        }
      }

      // Set up timeout for message response
      timeoutId = setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        reject(new Error(`[superdebugger/page.js] Timeout calling ${methodName}`));
      }, 30000); // 30 second timeout

      window.addEventListener("message", handleResponse);

      try {
        window.postMessage({
          direction: "from-page",
          type: "SUPER_DEBUGGER_CALL",
          requestId,
          methodName,
          args
        }, "*");
      } catch (err) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleResponse);
        reject(new Error(`[superdebugger/page.js] Error sending message: ${err.message}`));
      }
    });
  }

  function on(eventName, callback) {
    try {
      validateEventName(eventName);
      validateCallback(callback);

      if (!debuggerEventListeners.has(eventName)) {
        debuggerEventListeners.set(eventName, []);
      }
      debuggerEventListeners.get(eventName).push(callback);
    } catch (err) {
      console.error('[superdebugger/page.js] Error registering event listener:', err);
      throw err;
    }
  }

  function off(eventName, callback) {
    try {
      validateEventName(eventName);
      validateCallback(callback);

      if (!debuggerEventListeners.has(eventName)) return;
      
      const callbacks = debuggerEventListeners.get(eventName);
      const filteredCallbacks = callbacks.filter(fn => fn !== callback);
      debuggerEventListeners.set(eventName, filteredCallbacks);
    } catch (err) {
      console.error('[superdebugger/page.js] Error removing event listener:', err);
      throw err;
    }
  }

  // Create proxy with validation and error handling
  const debuggerProxy = new Proxy({ on, off }, {
    get: (target, prop) => {
      if (prop === 'on' || prop === 'off') {
        return target[prop];
      }

      // Validate method access
      if (typeof prop !== 'string') {
        throw new Error('[superdebugger/page.js] Invalid method name type');
      }

      return (...args) => {
        if (!STATE.initialized) {
          return Promise.reject(new Error('[superdebugger/page.js] Debugger interface not initialized'));
        }
        return callMethod(prop, ...args);
      };
    }
  });

  // Initialize the interface with proper error handling
  try {
    Object.defineProperty(window.Superpowers, 'debugger', {
      value: debuggerProxy,
      writable: false,
      configurable: false
    });
    STATE.initialized = true;
    STATE.eventListenersActive = true;
    console.log("[superdebugger/page.js] window.Superpowers.debugger is ready");
  } catch (err) {
    console.error('[superdebugger/page.js] Failed to initialize debugger interface:', err);
    throw err;
  }
})();