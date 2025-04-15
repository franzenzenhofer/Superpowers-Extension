// plugins/supersidepanel/page.js
// Exposes `window.Superpowers.sidePanel` to in-page scripts, bridging calls
// (e.g. sidePanel.open(), sidePanel.setOptions(...)) through the content script
// to the extension's service worker.

import { createPageBridge } from '/scripts/plugin_bridge.js';

(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Instantiate the bridge for 'supersidepanel'
  const sidePanelBridge = createPageBridge('supersidepanel');

  // Assign the bridge directly. 
  // Calls like Superpowers.sidePanel.open(...) will be proxied.
  // Event listeners can be attached via Superpowers.sidePanel.on(...)
  window.Superpowers.sidePanel = sidePanelBridge;

  /*
  console.log("[supersidepanel/page.js] Superpowers.sidePanel bridge ready");
  */
})();
