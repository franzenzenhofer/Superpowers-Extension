import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  // console.debug('[ga/page] Initializing GA page script');
  
  if (!window.Superpowers) {
    // console.debug('[ga/page] Creating Superpowers namespace');
    window.Superpowers = {};
  }
  if (!window.Superpowers.Ga) {
    // console.debug('[ga/page] Creating Superpowers.Ga namespace');
    window.Superpowers.Ga = {};
  }

  // Instantiate the bridge for 'ga'
  const gaBridge = createPageBridge('ga');

  // Assign the bridge directly to the Ga namespace.
  // Method calls like Superpowers.Ga.listAccounts(...) will be proxied.
  window.Superpowers.Ga = gaBridge;

  /*
  console.debug('[ga/page] Initialized Superpowers.Ga bridge.');
  */
})();
