// plugins/superenv/content.js
// Content script bridging between the page <-> service worker.

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function() {
    /*
    console.log("[superenv/content.js] loaded");
    */
  
    // Initialize the content bridge for 'superenv'
    // This replaces the manual message listening and forwarding below.
    createContentBridge('superenv');

    /*
    console.log("[superenv/content.js] Bridge initialized.");
    */

    // The old listener below is now redundant and removed.
    /*
    const VALID_TYPES = [
      "SUPERENV_GET_VARS",
      "SUPERENV_PROPOSE_VARS",
      "SUPERENV_LIST_ENV_SETS",
      "SUPERENV_GET_ENV_SET",
      "SUPERENV_SET_ENV_SET",
      "SUPERENV_DELETE_ENV_SET"
    ];
  
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
  
      const { type, requestId } = event.data;
      if (!VALID_TYPES.includes(type)) return; // ignore unknown
  
      chrome.runtime.sendMessage(event.data, (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            direction: "from-content-script",
            type: type + "_RESPONSE",
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }
  
        window.postMessage({
          direction: "from-content-script",
          type: type + "_RESPONSE",
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      });
    });
    */
})();
  