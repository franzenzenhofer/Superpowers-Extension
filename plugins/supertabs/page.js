// plugins/supertabs/page.js
// Runs in the real page context, injecting an object `Superpowers.tabs`
// that allows both direct method calls (e.g. Superpowers.tabs.query(...))
// and event listeners (onCreated, onUpdated, etc).

import { createPageBridge } from '../../scripts/plugin_bridge.js';

(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Create the bridge for supertabs
  const tabsProxy = createPageBridge('supertabs');
  
  // Attach to window.Superpowers
  window.Superpowers.tabs = tabsProxy;
})();
