// plugins/superenv/page.js
// page context. We define window.Superpowers.getEnvVars() / setEnvVars() / proposeVars().

(function(){
  if (!window.Superpowers) {
    window.Superpowers = {};
  }
  // console.log("[superenv/page.js] loaded in page context");

  // getEnvVars
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

  // setEnvVars (deprecated)
  window.Superpowers.setEnvVars = async function() {
    console.warn("[Superpowers] setEnvVars() is deprecated. Environment variables can only be set via the extension sidepanel.");
    return { success: false, error: "Environment variables can only be set via the extension sidepanel" };
  };

  // NEW: proposeVars(name, description)
  // If var does not exist, create it with empty value & store the description. If it exists, do not overwrite.
  window.Superpowers.proposeVars = async function(name, description) {
    return new Promise((resolve, reject) => {
      if (!name || typeof name !== 'string') {
        return reject(new Error("[superenv/proposeVars] 'name' is required and must be a string."));
      }
      const requestId = Math.random().toString(36).slice(2);

      function handleResp(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script") return;
        if (ev.data.type !== "SUPERENV_PROPOSE_VARS_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResp);
        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(ev.data.error || "[superEnv] proposeVars error");
        }
      }

      window.addEventListener("message", handleResp);

      window.postMessage({
        direction: "from-page",
        type: "SUPERENV_PROPOSE_VARS",
        requestId,
        payload: { name, description }
      }, "*");
    });
  };

  // Multi-env methods
  window.Superpowers.listEnvSets = async function() {
    return sendSuperEnvMsg("GET_ALL_ENV_SETS");
  };

  window.Superpowers.getEnvSet = async function(envName) {
    return sendSuperEnvMsg("GET_ENV_SET", { envName });
  };

  window.Superpowers.setEnvSet = async function(envName, varsObj) {
    return sendSuperEnvMsg("SET_ENV_SET", { envName, vars: varsObj });
  };

  window.Superpowers.deleteEnvSet = async function(envName) {
    return sendSuperEnvMsg("DELETE_ENV_SET", { envName });
  };

  function sendSuperEnvMsg(type, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...data }, (resp) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!resp || resp.success === false) return reject(resp?.error || "Unknown superenv error");
        resolve(resp);
      });
    });
  }

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

  // console.log("[superdebug/page.js] Debug logging initialized");
})();
