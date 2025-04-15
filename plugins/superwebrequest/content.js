// plugins/superwebrequest/content.js
// Minimal bridging from the page => SW (service worker)

import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function() {
  // Initialize the bridge for the 'superwebrequest' plugin
  createContentBridge('superwebrequest');
})();
