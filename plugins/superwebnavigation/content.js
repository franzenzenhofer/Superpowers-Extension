// plugins/superwebnavigation/content.js
// Content script bridging page <-> SW for chrome.webNavigation

import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function () {
  // Initialize the bridge for the 'superwebnavigation' plugin
  createContentBridge('superwebnavigation');
})();
