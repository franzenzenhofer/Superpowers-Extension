import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'superscreenshot'
  // This handles forwarding the 'capture' call to the extension
  // and relaying the final response back to the page.
  // It also automatically listens for broadcasted events (like 'PROGRESS')
  // from the extension and forwards them to the page.
  createContentBridge('superscreenshot');

  /*
  console.debug('[superscreenshot/content.js] Content bridge initialized.');
  */
})();

// The previous logic for handling SUPERSCREENSHOT, SUPERSCREENSHOT_RESPONSE,
// and SUPERSCREENSHOT_PROGRESS messages has been replaced by the bridge.
// The bridge handles request forwarding, response relaying, and event broadcasting.