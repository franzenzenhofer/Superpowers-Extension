// plugins/superenv/content.js
// content-script context. 
// Listen for SUPERENV_GET_VARS / SUPERENV_SET_VARS messages -> call chrome.runtime.

(function(){
    console.log("[superenv/content.js] loaded in content-script context");
  
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
      const { requestId } = event.data;
  
      switch(event.data.type) {
        case "SUPERENV_GET_VARS": {
          chrome.runtime.sendMessage({ type: "GET_ENV_VARS" }, (resp) => {
            window.postMessage({
              direction: "from-content-script",
              type: "SUPERENV_GET_VARS_RESPONSE",
              requestId,
              success: true,
              result: resp || {}
            }, "*");
          });
          break;
        }
        case "SUPERENV_SET_VARS": {
          const { vars } = event.data;
          chrome.runtime.sendMessage({ type: "SET_ENV_VARS", envVars: vars }, (resp) => {
            window.postMessage({
              direction: "from-content-script",
              type: "SUPERENV_SET_VARS_RESPONSE",
              requestId,
              success: !!(resp && resp.success),
              result: resp || {}
            }, "*");
          });
          break;
        }
        default:
          // ignore
          break;
      }
    });
  })();

// plugins/superdebug/content.js
(function() {
    const DEBUG = {
        log: (msg) => console.log(`[superdebug/content.js] ${msg}`)
    };

    // Send debug message to service worker and wait for acknowledgment
    async function sendDebugMessage(message, level, source) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: "SUPERDEBUG_LOG",
                message,
                level,
                source,
                timestamp: new Date().toISOString()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    DEBUG.log(`runtime.lastError: ${JSON.stringify(chrome.runtime.lastError)}`);
                    // Still resolve since the message was logged locally
                    resolve();
                    return;
                }
                resolve(response);
            });
        });
    }

    // Listen for debug messages from page
    window.addEventListener("message", async (event) => {
        if (!event.data || event.data.direction !== "from-page") return;
        if (event.data.type !== "SUPERDEBUG_LOG") return;

        const { message, level, source } = event.data;
        
        // Log locally first
        DEBUG.log(`Debug message: ${message} (${level})`);
        
        // Send to service worker and wait for acknowledgment
        await sendDebugMessage(message, level, source);
    });

    DEBUG.log("Debug listener initialized");
})();