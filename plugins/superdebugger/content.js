// plugins/superdebugger/content.js
// Minimal bridging from the page => SW for chrome.debugger API

/**
 * Content script initialization and message handling
 * Includes comprehensive error checking and chrome.* API validation
 */
(function() {
  // Validate extension environment
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('[superdebugger/content.js] Chrome extension APIs not available');
    return;
  }

  const STATE = {
    initialized: false,
    runtimeConnected: false
  };

  /**
   * Validates runtime connection by attempting a ping
   * @returns {Promise<boolean>} - Whether runtime is connected
   */
  async function validateRuntime() {
    try {
      await chrome.runtime.sendMessage({ type: 'SUPER_DEBUGGER_PING' });
      return true;
    } catch (err) {
      console.error('[superdebugger/content.js] Runtime connection failed:', err);
      return false;
    }
  }

  /**
   * Validates message structure
   * @param {any} data - Message data to validate
   * @returns {boolean} - Whether message is valid
   */
  function validateMessage(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.type || typeof data.type !== 'string') return false;
    if (!data.requestId || typeof data.requestId !== 'string') return false;
    return true;
  }

  /**
   * Safe message sender with retries
   * @param {object} message - Message to send
   * @param {number} retries - Number of retries left
   * @returns {Promise<any>} - Response from runtime
   */
  function sendMessageWithRetry(message, retries = 2) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.error('[superdebugger/content.js] Send error:', lastError);
          if (retries > 0 && lastError.message.includes('disconnected')) {
            setTimeout(() => {
              sendMessageWithRetry(message, retries - 1)
                .then(resolve)
                .catch(reject);
            }, 100);
          } else {
            reject(new Error(lastError.message));
          }
          return;
        }
        resolve(response);
      });
    });
  }

  // Set up message listener from page with error boundary
  window.addEventListener("message", async (event) => {
    try {
      if (!event.data || event.data.direction !== "from-page") return;
      if (event.data.type !== "SUPER_DEBUGGER_CALL") return;

      // Validate message structure
      if (!validateMessage(event.data)) {
        throw new Error('Invalid message structure');
      }

      const { requestId, methodName, args } = event.data;
      console.log("[superdebugger/content.js] SUPER_DEBUGGER_CALL =>", methodName, args);

      // Validate runtime connection
      if (!STATE.runtimeConnected) {
        STATE.runtimeConnected = await validateRuntime();
        if (!STATE.runtimeConnected) {
          throw new Error('Runtime connection failed');
        }
      }

      // Send message with retry logic
      try {
        const response = await sendMessageWithRetry({
          type: "SUPER_DEBUGGER_CALL",
          requestId,
          methodName,
          args
        });

        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_DEBUGGER_RESPONSE",
          requestId,
          success: response?.success ?? false,
          result: response?.result,
          error: response?.error
        }, "*");
      } catch (err) {
        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_DEBUGGER_RESPONSE",
          requestId,
          success: false,
          error: err.message || 'Failed to communicate with extension'
        }, "*");
      }
    } catch (err) {
      console.error('[superdebugger/content.js] Error processing message:', err);
      if (event?.data?.requestId) {
        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_DEBUGGER_RESPONSE",
          requestId: event.data.requestId,
          success: false,
          error: err.message || 'Internal error processing message'
        }, "*");
      }
    }
  });

  // Set up runtime message listener
  chrome.runtime.onMessage.addListener((message, sender) => {
    try {
      if (!message || !message.type) return;

      if (message.type === "SUPER_DEBUGGER_EVENT") {
        // Validate event message
        if (!message.eventName || !message.args) {
          console.error('[superdebugger/content.js] Invalid event message:', message);
          return;
        }

        window.postMessage({
          direction: "from-content-script",
          type: "SUPER_DEBUGGER_EVENT",
          eventName: message.eventName,
          args: message.args
        }, "*");
      }
    } catch (err) {
      console.error('[superdebugger/content.js] Error handling runtime message:', err);
    }
  });

  // Initialize state
  STATE.initialized = true;
  console.log("[superdebugger/content.js] loaded in content-script context");
})();