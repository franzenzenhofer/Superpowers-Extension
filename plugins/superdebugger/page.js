// plugins/superdebugger/page.js
import { createPageBridge } from '/scripts/plugin_bridge.js';

/**
 * Immediately invoked function to set up the debugger bridge
 * for interacting with chrome.debugger API.
 */
(function() {
  // Validate environment
  if (typeof window === 'undefined') {
    console.error('[superdebugger/page.js] Window object not available');
    return; 
  }
  if (!window.Superpowers) {
    window.Superpowers = {};
  }
  
  // Check if debugger is already defined and potentially non-writable
  const descriptor = Object.getOwnPropertyDescriptor(window.Superpowers, 'debugger');
  if (descriptor && !descriptor.writable && !descriptor.configurable) {
    console.error('[superdebugger/page.js] window.Superpowers.debugger is already defined and non-writable/non-configurable. Cannot initialize bridge.');
    return; // Cannot proceed
  } else if (window.Superpowers.debugger) {
     console.warn('[superdebugger/page.js] Overwriting existing window.Superpowers.debugger with chrome.debugger bridge.');
  }

  // Instantiate the bridge
  const debuggerBridge = createPageBridge('superdebugger');

  // --- Public API --- 
  const debuggerAPI = {
    /**
     * Attaches debugger to the given target.
     * @param {chrome.debugger.Debuggee} target - The debuggee target.
     * @param {string} requiredVersion - The required debugging protocol version.
     * @returns {Promise<void>}
     */
    attach: (target, requiredVersion) => {
      if (!target || (target.tabId === undefined && target.extensionId === undefined && target.targetId === undefined)) {
        return Promise.reject(new Error('Attach requires a valid target object (tabId, extensionId, or targetId).'));
      }
      if (typeof requiredVersion !== 'string' || requiredVersion.trim() === '') {
        return Promise.reject(new Error('Attach requires requiredVersion string.'));
      }
      return debuggerBridge.attach(target, requiredVersion);
    },

    /**
     * Detaches debugger from the given target.
     * @param {chrome.debugger.Debuggee} target - The debuggee target.
     * @returns {Promise<void>}
     */
    detach: (target) => {
      if (!target || (target.tabId === undefined && target.extensionId === undefined && target.targetId === undefined)) {
        return Promise.reject(new Error('Detach requires a valid target object (tabId, extensionId, or targetId).'));
      }
      return debuggerBridge.detach(target);
    },

    /**
     * Sends command to the target debuggee.
     * @param {chrome.debugger.Debuggee} target - The debuggee target.
     * @param {string} method - Method name.
     * @param {object} [commandParams] - JSON object with command parameters.
     * @returns {Promise<object|undefined>} - JSON object with response.
     */
    sendCommand: (target, method, commandParams) => {
       if (!target || (target.tabId === undefined && target.extensionId === undefined && target.targetId === undefined)) {
        return Promise.reject(new Error('sendCommand requires a valid target object (tabId, extensionId, or targetId).'));
      }
       if (typeof method !== 'string' || method.trim() === '') {
        return Promise.reject(new Error('sendCommand requires method string.'));
      }
      return debuggerBridge.sendCommand(target, method, commandParams);
    },

    /**
     * Adds a listener to debugger events.
     * Expected event names: 'onEvent', 'onDetach'
     * @param {'onEvent'|'onDetach'} eventName - The name of the event to listen for.
     * @param {function} callback - The function to call when the event occurs.
     */
    on: (eventName, callback) => {
       if (typeof callback !== 'function') {
            console.error('[superdebugger/page.js] Callback must be a function for .on()');
            return;
       }
       if (eventName !== 'onEvent' && eventName !== 'onDetach') {
            console.error(`[superdebugger/page.js] Invalid event name for .on(): ${eventName}. Use 'onEvent' or 'onDetach'.`);
            return;
       }
       debuggerBridge.on(eventName, callback);
    },

    /**
     * Removes a listener from debugger events.
     * @param {'onEvent'|'onDetach'} eventName - The name of the event.
     * @param {function} callback - The callback function to remove.
     */
    off: (eventName, callback) => {
       if (typeof callback !== 'function') {
            console.error('[superdebugger/page.js] Callback must be a function for .off()');
            return;
       }
       if (eventName !== 'onEvent' && eventName !== 'onDetach') {
            console.error(`[superdebugger/page.js] Invalid event name for .off(): ${eventName}. Use 'onEvent' or 'onDetach'.`);
            return;
       }
       debuggerBridge.off(eventName, callback);
    }
  };

  // --- Assign API to window --- 
  // Use direct assignment instead of Object.defineProperty to avoid potential conflicts
  // if the property exists but is writable.
  window.Superpowers.debugger = debuggerAPI;
  
  // console.log("[superdebugger/page.js] window.Superpowers.debugger (chrome.debugger bridge) is ready");

  // Ensure unrelated console interception code is removed.

})();