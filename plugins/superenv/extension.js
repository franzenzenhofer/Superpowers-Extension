// plugins/superenv/extension.js
// Runs in the service worker (background). Reads/writes env vars to chrome.storage.local
// under key 'superEnvVars'. You can store multiple named env sets plus a default set.
//
// We keep it straightforward: on each request, load from storage, do the update if needed,
// respond with the updated result. No complicated caching or queueing.

export const superenv_extension = {
    name: "superenv_extension",
  
    install(context) {
      // Listen for the messages from content script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // We check request.type for "SUPERENV_..."
        const msgType = request.type || "";
        if (!msgType.startsWith("SUPERENV_")) return false; // Not our message
  
        handleSuperenvMessage(request, sendResponse).catch((err) => {
          console.error("[superenv_extension] Error handling message:", err);
          sendResponse({ success: false, error: err.message });
        });
        return true; // Keep the message channel open for async
      });
    }
  };
  
  /**
   * Main handler. We always load from storage fresh so we get the latest changes.
   */
  async function handleSuperenvMessage(request, sendResponse) {
    const { type, envName, payload, vars } = request;
  
    const envVarsData = await loadFromStorage(); // { default: {...}, descriptions: {...}, otherEnv: {...}, ... }
  
    switch (type) {
      case "SUPERENV_GET_VARS": {
        const defaultVars = envVarsData.default || {};
        sendResponse({ success: true, result: defaultVars });
        return;
      }
  
      case "SUPERENV_PROPOSE_VARS": {
        // payload: { name, description }
        if (!payload || !payload.name) {
          throw new Error("Missing name in proposeVars");
        }
        // If not exist in default, create it with empty string
        if (!envVarsData.default[payload.name]) {
          envVarsData.default[payload.name] = "";
        }
        // Also store the description if provided
        if (payload.description) {
          if (!envVarsData.descriptions) {
            envVarsData.descriptions = {};
          }
          // Only set or update if not already set? Or always overwrite? 
          // We'll just store it (overwrites old description).
          envVarsData.descriptions[payload.name] = payload.description;
        }
  
        await saveToStorage(envVarsData);
        sendResponse({ success: true, result: { proposed: payload.name } });
        return;
      }
  
      case "SUPERENV_LIST_ENV_SETS": {
        // Return the entire object so user can see all environment sets
        sendResponse({ success: true, result: envVarsData });
        return;
      }
  
      case "SUPERENV_GET_ENV_SET": {
        const name = envName || "default";
        const subset = envVarsData[name] || {};
        sendResponse({ success: true, result: subset });
        return;
      }
  
      case "SUPERENV_SET_ENV_SET": {
        const name = envName || "default";
        envVarsData[name] = vars || {};
        await saveToStorage(envVarsData);
        sendResponse({ success: true, result: envVarsData[name] });
        return;
      }
  
      case "SUPERENV_DELETE_ENV_SET": {
        // We do not allow deleting 'default'
        const name = envName || "default";
        if (name === "default") {
          sendResponse({ success: false, error: "Cannot delete the default env set" });
          return;
        }
        if (envVarsData[name]) {
          delete envVarsData[name];
          await saveToStorage(envVarsData);
        }
        sendResponse({ success: true, result: {} });
        return;
      }
  
      default: {
        // if you had SET_ENV_VARS or others, handle them. We skip since it's deprecated
        throw new Error(`Unsupported superenv message type: ${type}`);
      }
    }
  }
  
  /**
   * loadFromStorage(): returns an object from chrome.storage.local, 
   * or a fallback structure if none is found.
   */
  function loadFromStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["superEnvVars"], (res) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        const data = res.superEnvVars || {};
        if (typeof data !== "object") {
          // If it was stored as a different type, fallback to empty
          return resolve({ default: {} });
        }
        // Make sure we have a .default at least
        if (!data.default) data.default = {};
        if (!data.descriptions) data.descriptions = {};
        resolve(data);
      });
    });
  }
  
  /**
   * saveToStorage(data): saves the object back under 'superEnvVars'
   */
  function saveToStorage(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ superEnvVars: data }, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
  }
  