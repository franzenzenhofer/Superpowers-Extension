// plugins/supersidepanel/content.js
// Bridges the page.js with the extension's service worker, using
// runtime.sendMessage() and window.postMessage().

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'supersidepanel'
  createContentBridge('supersidepanel');

  /*
  console.log('[supersidepanel/content.js] Content bridge initialized.');
  */
})();
