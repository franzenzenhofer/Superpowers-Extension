// plugins/gsc/content.js
// Content-script bridging for GSC plugin.
// Relays "GSC_CALL" from the page => SW => back to page.

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'gsc'
  createContentBridge('gsc');

  /*
  console.debug('[gsc/content.js] Content bridge initialized.');
  */
})();

// The previous logic for handling GSC_CALL, GSC_RESPONSE,
// and GSC_EVENT messages has been replaced by the bridge.
