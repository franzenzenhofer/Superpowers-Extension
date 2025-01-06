// plugins/superenv/page.js
// page context. We define window.Superpowers.getEnvVars() / setEnvVars().

(function(){
    if (!window.Superpowers) {
      window.Superpowers = {};
    }
    console.log("[superenv/page.js] loaded in page context");
  
    window.Superpowers.getEnvVars = async function() {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).slice(2);
  
        function handleResp(ev) {
          if (!ev.data || ev.data.direction !== "from-content-script") return;
          if (ev.data.type !== "SUPERENV_GET_VARS_RESPONSE") return;
          if (ev.data.requestId !== requestId) return;
  
          window.removeEventListener("message", handleResp);
          if (ev.data.success) {
            resolve(ev.data.result);
          } else {
            reject("[superEnv] unknown getVars error");
          }
        }
  
        window.addEventListener("message", handleResp);
  
        window.postMessage({
          direction: "from-page",
          type: "SUPERENV_GET_VARS",
          requestId
        }, "*");
      });
    };
  
    window.Superpowers.setEnvVars = async function(varsObj) {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).slice(2);
  
        function handleResp(ev) {
          if (!ev.data || ev.data.direction !== "from-content-script") return;
          if (ev.data.type !== "SUPERENV_SET_VARS_RESPONSE") return;
          if (ev.data.requestId !== requestId) return;
  
          window.removeEventListener("message", handleResp);
          if (ev.data.success) {
            resolve(ev.data.result);
          } else {
            reject("[superEnv] unknown setVars error");
          }
        }
  
        window.addEventListener("message", handleResp);
  
        window.postMessage({
          direction: "from-page",
          type: "SUPERENV_SET_VARS",
          requestId,
          vars: varsObj
        }, "*");
      });
    };

    window.Superpowers.debugLog = function(message, level = "info", source = "page") {
        // Always log to console
        console.log(`[Superpowers.debugLog][${new Date().toISOString()}] ${message}`);

        // Send to content script
        window.postMessage({
            direction: "from-page",
            type: "SUPERDEBUG_LOG",
            message,
            level,
            source
        }, "*");
    };

    console.log("[superdebug/page.js] Debug logging initialized");
})();