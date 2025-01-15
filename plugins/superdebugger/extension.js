// plugins/superdebugger/extension.js
// Minimal bridging for chrome.debugger methods with comprehensive error handling

/**
 * @typedef {Object} ExtensionState
 * @property {boolean} initialized - Whether the extension is initialized
 * @property {boolean} debuggerAvailable - Whether chrome.debugger API is available
 * @property {boolean} eventListenersRegistered - Whether event listeners are set up
 * @property {Set<number>} activeDebugSessions - Set of active debugging session tab IDs
 */

/**
 * Extension state management
 * @type {ExtensionState}
 */
const STATE = {
  initialized: false,
  debuggerAvailable: false,
  eventListenersRegistered: false,
  activeDebugSessions: new Set()
};

// Validation constants
const VALID_METHODS = new Set([
  'attach',
  'detach',
  'sendCommand',
  'getTargets'
]);

const VALID_EVENTS = new Set([
  'onDetach',
  'onEvent'
]);

/**
 * Validates chrome.debugger API availability and permissions
 * @returns {Promise<boolean>} Whether debugger API is available and permitted
 * @throws {Error} If API or permissions are not available
 */
async function validateDebuggerAPI() {
  if (typeof chrome === 'undefined') {
    throw new Error('[superdebugger_extension] Chrome API not available');
  }

  if (!chrome.debugger) {
    throw new Error('[superdebugger_extension] chrome.debugger API not available');
  }

  // Validate all required methods exist
  for (const method of VALID_METHODS) {
    if (typeof chrome.debugger[method] !== 'function') {
      throw new Error(`[superdebugger_extension] chrome.debugger.${method} not available`);
    }
  }

  // Validate all required events exist
  for (const event of VALID_EVENTS) {
    if (!chrome.debugger[event] || !chrome.debugger[event].addListener) {
      throw new Error(`[superdebugger_extension] chrome.debugger.${event} not available`);
    }
  }

  // Check permissions
  try {
    const permissions = await chrome.permissions.contains({ permissions: ['debugger'] });
    if (!permissions) {
      throw new Error('[superdebugger_extension] debugger permission not granted');
    }
  } catch (err) {
    throw new Error(`[superdebugger_extension] Permission check failed: ${err.message}`);
  }

  return true;
}

/**
 * Validates debugger method parameters
 * @param {string} methodName - Name of the method being called
 * @param {Array<any>} args - Arguments passed to the method
 * @throws {Error} If parameters are invalid
 */
function validateMethodParams(methodName, args) {
  if (!VALID_METHODS.has(methodName)) {
    throw new Error(`[superdebugger_extension] Invalid method: ${methodName}`);
  }

  switch (methodName) {
    case 'attach': {
      if (!args[0] || typeof args[0] !== 'object') {
        throw new Error('[superdebugger_extension] attach: Invalid target parameter');
      }
      if (!args[1] || typeof args[1] !== 'string') {
        throw new Error('[superdebugger_extension] attach: Invalid version parameter');
      }
      break;
    }
    case 'detach': {
      if (!args[0] || typeof args[0] !== 'object') {
        throw new Error('[superdebugger_extension] detach: Invalid target parameter');
      }
      break;
    }
    case 'sendCommand': {
      if (!args[0] || typeof args[0] !== 'object') {
        throw new Error('[superdebugger_extension] sendCommand: Invalid target parameter');
      }
      if (!args[1] || typeof args[1] !== 'string') {
        throw new Error('[superdebugger_extension] sendCommand: Invalid method parameter');
      }
      break;
    }
    // getTargets doesn't need parameter validation
  }
}

/**
 * Tracks active debug sessions and their state
 */
class DebugSessionManager {
  /**
   * @param {number} tabId - ID of the tab being debugged
   * @returns {boolean} Whether the tab is currently being debugged
   */
  static isSessionActive(tabId) {
    return STATE.activeDebugSessions.has(tabId);
  }

  /**
   * @param {number} tabId - ID of the tab to register
   * @throws {Error} If session already exists
   */
  static registerSession(tabId) {
    if (this.isSessionActive(tabId)) {
      throw new Error(`[superdebugger_extension] Debug session already exists for tab ${tabId}`);
    }
    STATE.activeDebugSessions.add(tabId);
  }

  /**
   * @param {number} tabId - ID of the tab to unregister
   */
  static unregisterSession(tabId) {
    STATE.activeDebugSessions.delete(tabId);
  }
}

/**
 * Attempts to call chrome.debugger methods with comprehensive error handling
 * @param {string} methodName - Name of the method to call
 * @param {Array<any>} args - Arguments for the method
 * @returns {Promise<any>} Result of the method call
 * @throws {Error} If the call fails
 */
async function callChromeDebugger(methodName, args = []) {
  if (!STATE.debuggerAvailable) {
    throw new Error('[superdebugger_extension] Debugger API not available');
  }

  try {
    // Validate method parameters
    validateMethodParams(methodName, args);

    // Track session state for attach/detach
    if (methodName === 'attach' && args[0].tabId) {
      DebugSessionManager.registerSession(args[0].tabId);
    } else if (methodName === 'detach' && args[0].tabId) {
      DebugSessionManager.unregisterSession(args[0].tabId);
    }

    // Attempt promise-based call first
    try {
      return await chrome.debugger[methodName](...args);
    } catch (err) {
      // If it's not a promise implementation, fall back to callback
      return new Promise((resolve, reject) => {
        chrome.debugger[methodName](...args, (result) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            // Clean up session state on error
            if (methodName === 'attach' && args[0].tabId) {
              DebugSessionManager.unregisterSession(args[0].tabId);
            }
            reject(new Error(lastErr.message));
            return;
          }
          resolve(result);
        });
      });
    }
  } catch (err) {
    throw new Error(`[superdebugger_extension] ${methodName} failed: ${err.message}`);
  }
}

/**
 * Broadcasts debugger events to all tabs
 * @param {string} eventName - Name of the event
 * @param {Array<any>} eventArgs - Event arguments
 */
async function broadcastDebuggerEvent(eventName, eventArgs) {
  try {
    const tabs = await chrome.tabs.query({});
    const errors = [];

    await Promise.all(tabs.map(async (tab) => {
      if (tab.id < 0) return;

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "SUPER_DEBUGGER_EVENT",
          eventName,
          args: eventArgs,
        });
      } catch (err) {
        errors.push(`Tab ${tab.id}: ${err.message}`);
      }
    }));

    if (errors.length > 0) {
      console.error('[superdebugger_extension] Broadcast errors:', errors);
    }
  } catch (err) {
    console.error('[superdebugger_extension] Failed to broadcast event:', err);
  }
}

/**
 * Extension installation and setup
 */
export const superdebugger_extension = {
  name: "superdebugger_extension",

  async install(context) {
    try {
      if (context.debug) {
        // console.log("[superdebugger_extension] Installing superdebugger in SW...");
      }

      // Validate API availability
      STATE.debuggerAvailable = await validateDebuggerAPI();

      // Set up message listener
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "SUPER_DEBUGGER_PING") {
          sendResponse({ success: true });
          return false;
        }

        if (request.type !== "SUPER_DEBUGGER_CALL") return false;

        const { requestId, methodName, args } = request;
        // console.log(`[superdebugger_extension] method=${methodName}, requestId=${requestId}`);

        callChromeDebugger(methodName, args)
          .then(result => sendResponse({ success: true, result }))
          .catch(err => sendResponse({ 
            success: false, 
            error: err.message || String(err)
          }));

        return true; // indicates async response
      });

      // Set up debugger event listeners
      VALID_EVENTS.forEach(evtName => {
        chrome.debugger[evtName].addListener((...args) => {
          broadcastDebuggerEvent(evtName, args);
        });
      });

      // Clean up debug sessions when tabs are closed
      chrome.tabs.onRemoved.addListener((tabId) => {
        DebugSessionManager.unregisterSession(tabId);
      });

      STATE.eventListenersRegistered = true;
      STATE.initialized = true;

    } catch (err) {
      console.error('[superdebugger_extension] Installation failed:', err);
      throw err;
    }
  }
};