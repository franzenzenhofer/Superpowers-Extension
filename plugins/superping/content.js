// plugins/superping/content.js
// Content-script bridging for Superping.
// We listen for "SUPERPING" messages from the real page => forward to SW => no real response needed.

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function() {
  // Initialize the content bridge for 'superping'
  // Now that page.js is async, this needs to handle the request/response flow.
  createContentBridge('superping');

  /*
  console.log('[superping/content.js] Content bridge initialized.');
  */
})();

// Old fire-and-forget listener removed.
