// plugins/superwebnavigation/page.js
// Bridge from real page => content => SW for chrome.webNavigation.

import { createPageBridge } from '../../scripts/plugin_bridge.js';

(function () {
  if (!window.Superpowers) window.Superpowers = {};

  // Create the bridge for superwebnavigation
  const webNavProxy = createPageBridge('superwebnavigation');
  
  // Attach to window.Superpowers
  window.Superpowers.webNavigation = webNavProxy;
})();
