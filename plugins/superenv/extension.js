// plugins/superenv/extension.js
// Runs in the service worker (background). Reads/writes env vars to chrome.storage.local
// under key 'superEnvVars'. You can store multiple named env sets plus a default set.
//
// We keep it straightforward: on each request, load from storage, do the update if needed,
// respond with the updated result. No complicated caching or queueing.

import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

// Add cache variables
let swCache = null; // Service worker cache
let isCacheValid = false;

/**
 * Get environment variables from cache or storage
 * Uses in-memory cache to avoid repeated storage reads
 */
async function getEnvVarsFromCacheOrStorage() {
  if (isCacheValid && swCache !== null) {
    console.log("[superenv] Returning cached env vars");
    return swCache.default || {};
  }
  
  console.log("[superenv] Cache invalid or empty, loading from storage");
  try {
    swCache = await loadFromStorage(); // Use existing function
    isCacheValid = true;
    console.log("[superenv] Cache populated from storage");
    return swCache.default || {};
  } catch (error) {
    console.error("[superenv] Failed to load from storage:", error);
    isCacheValid = false; // Ensure cache remains invalid on error
    swCache = null; // Clear potentially partial cache
    throw error; // Re-throw error
  }
}

export const superenv_extension = {
    name: "superenv_extension",
  
    install(context) {
      // Define method handlers, breaking out the logic from the old switch statement
      // Bridge passes (methodName, args, sender, requestId)
      const methodHandlers = {
        // GET /vars => SUPERENV_GET_VARS
        getEnvVars: async (methodName, args) => {
          try {
            console.log("[superenv] Handling getEnvVars request - Using cache when available");
            
            // Use cached values when available
            const defaultVars = await getEnvVarsFromCacheOrStorage();
            
            // Log presence/absence of key for debugging
            if (defaultVars && typeof defaultVars.OPENAI_API_KEY === 'string') {
              console.log("[superenv] Responding with env vars including OPENAI_API_KEY");
            } else {
              console.warn("[superenv] Responding, but OPENAI_API_KEY is missing in stored data");
            }
            
            // Return the stored environment variables or an empty object
            return defaultVars || {};
          } catch (error) {
            console.error("[superenv] Error retrieving environment variables:", error);
            throw error; // Propagate error to caller
          }
        },
  
        // POST /propose => SUPERENV_PROPOSE_VARS
        proposeVars: async (methodName, args) => {
          const payload = args[0]; // Expect { name, description }
          if (!payload || !payload.name) {
            throw new Error("Missing name in proposeVars payload");
          }
          const envVarsData = await loadFromStorage();
          if (!envVarsData.default) envVarsData.default = {};
          if (!envVarsData.descriptions) envVarsData.descriptions = {};
  
          // If var doesn't exist in default, create it with empty string
          if (envVarsData.default[payload.name] === undefined) { // Check specifically for undefined
            envVarsData.default[payload.name] = "";
          }
          // Store description (overwrites if exists)
          if (payload.description !== undefined) {
            envVarsData.descriptions[payload.name] = payload.description;
          }
          await saveToStorage(envVarsData);
          
          // Invalidate cache after modification
          isCacheValid = false;
          swCache = null;
          
          return { proposed: payload.name };
        },
  
        // GET /sets => SUPERENV_LIST_ENV_SETS
        listEnvSets: async (methodName, args) => {
          return loadFromStorage();
        },
  
        // GET /sets/:name => SUPERENV_GET_ENV_SET
        getEnvSet: async (methodName, args) => {
          const envName = args[0] || "default";
          const envVarsData = await loadFromStorage();
          return envVarsData[envName] || {};
        },
  
        // POST /sets/:name => SUPERENV_SET_ENV_SET
        setEnvSet: async (methodName, args) => {
          const envName = args[0] || "default";
          const varsObj = args[1] || {};
          const envVarsData = await loadFromStorage();
          envVarsData[envName] = varsObj;
          await saveToStorage(envVarsData);
          
          // Invalidate cache after modification
          isCacheValid = false;
          swCache = null;
          
          return envVarsData[envName];
        },
  
        // DELETE /sets/:name => SUPERENV_DELETE_ENV_SET
        deleteEnvSet: async (methodName, args) => {
          const envName = args[0];
          if (!envName || envName === "default") {
            throw new Error("Cannot delete the default env set or missing name");
          }
          const envVarsData = await loadFromStorage();
          if (envVarsData[envName]) {
            delete envVarsData[envName];
            await saveToStorage(envVarsData);
            
            // Invalidate cache after modification
            isCacheValid = false;
            swCache = null;
          }
          return {}; // Return empty object on success
        },
      };
  
      // Create the extension bridge
      createExtensionBridge({
        pluginName: 'superenv',
        methodHandlers,
      });
      
      // Add storage listener to invalidate cache when superEnvVars changes
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.superEnvVars) {
          console.log("[superenv] Detected storage change for superEnvVars. Invalidating cache.");
          isCacheValid = false;
          swCache = null;
        }
      });
      
      // Pre-warm the cache when the extension starts
      getEnvVarsFromCacheOrStorage().catch(err => {
        console.warn("[superenv] Initial cache pre-warming failed:", err);
      });
      
      console.log("[superenv_extension] Extension bridge initialized with caching.");
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
          return resolve({ default: {}, descriptions: {} }); // Ensure descriptions exists
        }
        // Make sure we have .default and .descriptions
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
  