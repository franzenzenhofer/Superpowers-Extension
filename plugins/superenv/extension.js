// plugins/superenv/extension.js (ES module)

// Cache to improve performance
let envVarsCache = null;

export const superenv_extension = {
    name: "superenv_extension",
  
    install(context) {
      const { debug } = context;
      if (debug) console.log("[superenv_extension] Installing superenv in SW...");
  
      // Initial load from storage
      loadEnvVarsFromStorage();

      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request) return;
  
        switch (request.type) {
          case "GET_ENV_VARS":
            if (debug) console.log("[superenv_extension] GET_ENV_VARS request");
            handleGetEnvVars(sendResponse, debug);
            return true; // async
  
          case "SET_ENV_VARS":
            if (debug) console.log("[superenv_extension] SET_ENV_VARS request");
            handleSetEnvVars(request, sendResponse, debug);
            return true; // async

          case "GET_ALL_ENV_SETS":
            handleGetAllEnvSets(sendResponse);
            return true;

          case "GET_ENV_SET":
            handleGetEnvSet(request, sendResponse);
            return true;

          case "SET_ENV_SET":
            handleSetEnvSet(request, sendResponse);
            return true;

          case "DELETE_ENV_SET":
            handleDeleteEnvSet(request, sendResponse);
            return true;
        }
      });
    }
};

// Load variables from storage into cache
async function loadEnvVarsFromStorage() {
    try {
        const result = await chrome.storage.local.get(['superEnvVars']);
        envVarsCache = result.superEnvVars || {};
        if (typeof envVarsCache !== "object") {
            envVarsCache = { default: envVarsCache || {} };
        }
        console.log("[superenv_extension] Loaded env vars from storage:", envVarsCache);
    } catch (err) {
        console.error("[superenv_extension] Error loading from storage:", err);
        envVarsCache = {};
    }
}

function handleGetEnvVars(sendResponse, debug) {
    // First check cache
    if (envVarsCache !== null) {
        if (debug) console.log("[superenv_extension] Serving from cache:", envVarsCache);
        sendResponse(envVarsCache.default || {});
        return;
    }

    // If no cache, load from storage
    chrome.storage.local.get(['superEnvVars'], (result) => {
        envVarsCache = result.superEnvVars || {};
        if (debug) console.log("[superenv_extension] Loaded from storage:", envVarsCache);
        sendResponse(envVarsCache.default || {});
    });
}

function handleSetEnvVars(request, sendResponse, debug) {
    const newVars = request.envVars || {};
    
    // Update cache
    envVarsCache.default = { ...newVars };

    // Save to persistent storage
    chrome.storage.local.set({ 
        superEnvVars: envVarsCache 
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("[superenv_extension] Storage error:", chrome.runtime.lastError);
            sendResponse({ 
                success: false, 
                error: chrome.runtime.lastError.message 
            });
            return;
        }
        if (debug) console.log("[superenv_extension] Saved to storage:", newVars);
        sendResponse({ 
            success: true,
            vars: newVars 
        });
    });
}

function handleGetAllEnvSets(sendResponse) {
    sendResponse(envVarsCache || {});
}

function handleGetEnvSet(request, sendResponse) {
    const envName = request.envName || "default";
    sendResponse(envVarsCache?.[envName] || {});
}

function handleSetEnvSet(request, sendResponse) {
    const { envName, vars } = request;
    const name = envName || "default";
    envVarsCache[name] = vars || {};
    chrome.storage.local.set({ superEnvVars: envVarsCache }, () => {
        sendResponse({ success: true, envSet: envVarsCache[name] });
    });
}

function handleDeleteEnvSet(request, sendResponse) {
    const { envName } = request;
    if (envName && envName !== "default") {
        delete envVarsCache[envName];
        chrome.storage.local.set({ superEnvVars: envVarsCache }, () => {
            sendResponse({ success: true });
        });
    } else {
        sendResponse({ success: false, error: "Cannot delete default set or invalid name" });
    }
}

// plugins/superdebug/extension.js
export const superdebug_extension = {
    name: "superdebug_extension",

    install(context) {
        const { debug } = context;
        
        // Handle debug messages
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type !== "SUPERDEBUG_LOG") return false;

            // Log the debug message
            console.log(`[Superdebug][${request.timestamp}][${request.level}] ${request.message}`);
            
            // Always send a response to prevent port closure warnings
            sendResponse({ received: true });
            
            // Store in debug history if needed
            if (context.debugHistory) {
                context.debugHistory.push({
                    timestamp: request.timestamp,
                    level: request.level,
                    message: request.message,
                    source: request.source
                });
            }
            
            return true; // Will respond async
        });

        if (debug) console.log("[superdebug_extension] Installed");
    }
};