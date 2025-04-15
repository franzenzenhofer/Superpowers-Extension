// plugins/storage/content.js
// Content script to relay messages between page and service worker

import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function() {
  // Initialize the bridge for the 'storage' plugin
  createContentBridge('storage');
})();
