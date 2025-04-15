// plugins/supertabs/content.js
// Runs in the content-script context. Relays messages between page <-> service worker.
// Uses the plugin bridge to handle communication.

import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function () {
  // Initialize the bridge for the 'supertabs' plugin
  createContentBridge('supertabs');
})();
