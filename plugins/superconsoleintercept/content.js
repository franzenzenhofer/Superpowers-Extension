import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'superconsoleintercept'
  // This handles forwarding calls (like logEvent, enable, disable)
  // to the extension and relaying broadcasted events (CONSOLE_EVENT)
  // from the extension back to the page.
  createContentBridge('superconsoleintercept');

  /*
  console.debug('[superconsoleintercept/content.js] Content bridge initialized.');
  */
})();

// The previous logic for forwarding SUPER_CONSOLE_EVENT messages
// in both directions has been replaced by the bridge.
