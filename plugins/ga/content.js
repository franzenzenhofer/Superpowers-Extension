// plugins/ga/content.js
// Content-script bridging for GA plugin.
// Relays "GA_CALL" from the page => SW => back to page.

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'ga'
  createContentBridge('ga');

  /*
  console.debug('[ga/content.js] Content bridge initialized.');
  */
})();

// The previous logic for handling GA_CALL, GA_RESPONSE,
// and GA_EVENT messages has been replaced by the bridge.
