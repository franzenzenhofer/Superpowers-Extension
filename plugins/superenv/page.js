// plugins/superenv/page.js
// Minimal "superenv" in the real page context. Exposes:
//   - Superpowers.getEnvVars()
//   - Superpowers.setEnvVars()  (currently deprecated in this example)
//   - Superpowers.proposeVars(...)
//   - Superpowers.listEnvSets(), getEnvSet(...), setEnvSet(...), deleteEnvSet(...)

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  /**
   * A helper to post a message to the content script and await the response.
   * @param {string} msgType - The message type (e.g. "SUPERENV_GET_VARS")
   * @param {Object} extraData - Any extra properties to post.
   */
  function sendSuperenvMessage(msgType, extraData = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(event) {
        if (!event.data || event.data.direction !== "from-content-script") return;
        if (event.data.type !== msgType + "_RESPONSE") return;
        if (event.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);

        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error || "Unknown superenv error"));
        }
      }

      window.addEventListener("message", handleResponse);

      // Post the request to the content script
      window.postMessage({
        direction: "from-page",
        type: msgType,
        requestId,
        ...extraData
      }, "*");
    });
  }

  /**
   * 1) Get environment variables (default set).
   */
  window.Superpowers.getEnvVars = function() {
    return sendSuperenvMessage("SUPERENV_GET_VARS");
  };

  /**
   * 2) Deprecated setEnvVars (no-op in this simplified version).
   */
  window.Superpowers.setEnvVars = function(newVarsObject) {
    console.warn("[Superpowers] setEnvVars() is deprecated; manage env vars in the extension UI.");
    return Promise.resolve({ success: false, error: "Deprecated method" });
  };

  /**
   * 3) proposeVars(name, description):
   *    - If env var doesn't exist, create it with empty value & store the description.
   *    - If it exists, don't overwrite value, but we store description if missing.
   */
  window.Superpowers.proposeVars = function(name, description) {
    if (!name) {
      return Promise.reject(new Error("proposeVars: 'name' is required"));
    }
    return sendSuperenvMessage("SUPERENV_PROPOSE_VARS", {
      payload: { name, description: description || "" }
    });
  };

  /**
   * 4) Multi-env set calls
   */
  window.Superpowers.listEnvSets = function() {
    return sendSuperenvMessage("SUPERENV_LIST_ENV_SETS");
  };
  window.Superpowers.getEnvSet = function(envName) {
    return sendSuperenvMessage("SUPERENV_GET_ENV_SET", { envName });
  };
  window.Superpowers.setEnvSet = function(envName, varsObj) {
    return sendSuperenvMessage("SUPERENV_SET_ENV_SET", { envName, vars: varsObj });
  };
  window.Superpowers.deleteEnvSet = function(envName) {
    return sendSuperenvMessage("SUPERENV_DELETE_ENV_SET", { envName });
  };

})();
