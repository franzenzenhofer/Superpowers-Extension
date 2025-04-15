import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'superurlget'
  // This handles forwarding calls to the extension and relaying responses/events back.
  createContentBridge('superurlget');

  /*
  console.debug('[superurlget/content.js] Content bridge initialized.');
  */
})();

// The previous logic for handling SUPERURLGET_CALL, _RESPONSE, and _EVENT
// messages has been replaced by the bridge.
