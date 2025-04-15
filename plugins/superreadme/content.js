import { createContentBridge } from '/scripts/plugin_bridge.js';

(function() {
  console.log("[superreadme/content.js] Loaded in content-script context");

  // Initialize the content bridge for 'superreadme'
  createContentBridge('superreadme');

  /*
  console.log('[superreadme/content.js] Content bridge initialized.');
  */
})();
