// plugins/superpingasync/content.js
import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'superpingasync'
  createContentBridge('superpingasync');

  /*
  console.log('[superpingasync/content.js] Content bridge initialized.');
  */
})();

// Old listener removed.