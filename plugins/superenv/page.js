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

  // Instantiate the bridge for 'superenv'
  const envBridge = createPageBridge('superenv');

  // Assign the bridge directly to the new Env namespace.
  // Method calls like Superpowers.env.getEnvVars(...) will be proxied.
  window.Superpowers.Env = envBridge;

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

  /*
  console.debug('[superenv/page.js] Initialized Superpowers.Env bridge.');
  */
})();

// The old sendSuperenvMessage helper and direct method assignments are removed.
// The new primary interface is Superpowers.Env.methodName(...)
// Backwards compatibility with warnings is provided for old method names.
