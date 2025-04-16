// plugins/superenv/page.js
// Minimal "superenv" in the real page context. Exposes:
//   - Superpowers.getEnvVars()
//   - Superpowers.setEnvVars()  (currently deprecated in this example)
//   - Superpowers.proposeVars(...)
//   - Superpowers.listEnvSets(), getEnvSet(...), setEnvSet(...), deleteEnvSet(...)

import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  // Rename the namespace to Superpowers.env for clarity
  if (window.Superpowers.Env) {
    console.warn("[superenv/page.js] window.Superpowers.Env already exists. Overwriting.");
  }

  // In-memory cache for env vars to provide robustness against storage failures
  let pageCachedEnv = {};

  // Instantiate the bridge for 'superenv'
  const envBridge = createPageBridge('superenv');
  
  // Store original bridge methods before overriding
  const originalGetEnvVars = envBridge.getEnvVars;

  // Create the Env namespace with enhanced methods
  window.Superpowers.Env = {
    // Other bridge methods remain unchanged
    proposeVars: envBridge.proposeVars,
    listEnvSets: envBridge.listEnvSets,
    getEnvSet: envBridge.getEnvSet,
    setEnvSet: envBridge.setEnvSet,
    deleteEnvSet: envBridge.deleteEnvSet,
    
    // Enhanced getEnvVars with caching for robustness
    getEnvVars: async (...args) => {
      try {
        // Try to get fresh env vars from extension
        const freshVars = await originalGetEnvVars(...args);
        
        // Update cache on success
        pageCachedEnv = { ...pageCachedEnv, ...freshVars };
        console.debug('[superenv/page] Cache updated from successful fetch.');
        
        return freshVars; // Return fresh data
      } catch (error) {
        console.warn('[superenv/page] Failed to fetch env vars, returning cached version:', error);
        
        // Return cached data instead of rejecting
        return { ...pageCachedEnv };
      }
    },
    
    // New synchronous method to directly access cached env vars
    getCachedEnvVars: () => {
      return { ...pageCachedEnv };
    }
  };

  // Provide backwards compatibility for old names, but log a warning
  const warnDeprecated = (oldName, newName) => {
    console.warn(`[Superpowers] Method ${oldName}() is deprecated. Please use ${newName}() instead.`);
  };

  // Map old names to new bridge calls with warnings
  window.Superpowers.getEnvVars = (...args) => {
    warnDeprecated('Superpowers.getEnvVars', 'Superpowers.Env.getEnvVars');
    return window.Superpowers.Env.getEnvVars(...args);
  };
  window.Superpowers.proposeVars = (...args) => {
    warnDeprecated('Superpowers.proposeVars', 'Superpowers.Env.proposeVars');
    return window.Superpowers.Env.proposeVars(...args);
  };
  window.Superpowers.listEnvSets = (...args) => {
    warnDeprecated('Superpowers.listEnvSets', 'Superpowers.Env.listEnvSets');
    return window.Superpowers.Env.listEnvSets(...args);
  };
  window.Superpowers.getEnvSet = (...args) => {
    warnDeprecated('Superpowers.getEnvSet', 'Superpowers.Env.getEnvSet');
    return window.Superpowers.Env.getEnvSet(...args);
  };
  window.Superpowers.setEnvSet = (...args) => {
    warnDeprecated('Superpowers.setEnvSet', 'Superpowers.Env.setEnvSet');
    return window.Superpowers.Env.setEnvSet(...args);
  };
  window.Superpowers.deleteEnvSet = (...args) => {
    warnDeprecated('Superpowers.deleteEnvSet', 'Superpowers.Env.deleteEnvSet');
    return window.Superpowers.Env.deleteEnvSet(...args);
  };

  // Deprecated setEnvVars (no bridge equivalent needed)
  window.Superpowers.setEnvVars = function(newVarsObject) {
    console.warn("[Superpowers] setEnvVars() is deprecated; manage env vars in the extension UI.");
    return Promise.resolve({ success: false, error: "Deprecated method" });
  };

  // Trigger an initial getEnvVars to populate the cache early
  window.Superpowers.Env.getEnvVars().catch(error => {
    console.warn("[superenv/page] Initial environment load failed:", error);
  });

  console.debug('[superenv/page.js] Initialized Superpowers.Env bridge with robust caching.');
})();

// The old sendSuperenvMessage helper and direct method assignments are removed.
// The new primary interface is Superpowers.Env.methodName(...)
// Backwards compatibility with warnings is provided for old method names.
