// plugins/superenv/content.js
// Content script bridging between the page <-> service worker.
// We only listen for "SUPERENV_..." messages from the page,
// then forward them via chrome.runtime.sendMessage to the SW.

(function() {
    console.log("[superenv/content.js] loaded");
  
    const VALID_TYPES = [
      "SUPERENV_GET_VARS",
      "SUPERENV_PROPOSE_VARS",
      "SUPERENV_LIST_ENV_SETS",
      "SUPERENV_GET_ENV_SET",
      "SUPERENV_SET_ENV_SET",
      "SUPERENV_DELETE_ENV_SET"
      // setEnvVars is deprecated, so we skip
    ];
  
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
  
      const { type, requestId } = event.data;
      if (!VALID_TYPES.includes(type)) return; // ignore unknown
  
      chrome.runtime.sendMessage(event.data, (response) => {
        // In case the extension is reloaded or not responding:
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
  
        // Return the final result
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
  })();
  