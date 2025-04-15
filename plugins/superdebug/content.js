// plugins/superdebug/content.js
import { createContentBridge } from '/scripts/plugin_bridge.js';

(function () {
  // Initialize the content bridge for 'superdebug'
  // This handles forwarding calls (log, enableContext, disableContext)
  // to the extension.
  createContentBridge('superdebug');

  /*
  console.debug('[superdebug/content.js] Content bridge initialized.');
  */
})();

// The previous logic for forwarding SUPERPOWERS_DEBUGLOG
// messages has been replaced by the bridge.
