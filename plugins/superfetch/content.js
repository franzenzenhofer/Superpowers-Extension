// plugins/superfetch/content.js
// Content script to relay messages between page and service worker

import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function() {
  // Initialize the bridge for the 'superfetch' plugin
  createContentBridge('superfetch');
  
  console.debug('[superfetch/content] Bridge initialized.');
})();
