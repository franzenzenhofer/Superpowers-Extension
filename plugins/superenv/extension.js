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
        }
      });
    }
};

// Load variables from storage into cache
async function loadEnvVarsFromStorage() {
    try {
        const result = await chrome.storage.local.get(['superEnvVars']);
        envVarsCache = result.superEnvVars || {};
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
        sendResponse(envVarsCache);
        return;
    }

    // If no cache, load from storage
    chrome.storage.local.get(['superEnvVars'], (result) => {
        envVarsCache = result.superEnvVars || {};
        if (debug) console.log("[superenv_extension] Loaded from storage:", envVarsCache);
        sendResponse(envVarsCache);
    });
}

function handleSetEnvVars(request, sendResponse, debug) {
    const newVars = request.envVars || {};
    
    // Update cache
    envVarsCache = { ...newVars };

    // Save to persistent storage
    chrome.storage.local.set({ 
        superEnvVars: newVars 
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