// plugins/superruntime/content.js
import { createContentBridge } from '../../scripts/plugin_bridge.js';

(function() {
  let enabled = false;

  // Initialize the bridge for the 'superruntime' plugin
  createContentBridge('superruntime');

  // Handle control messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SUPER_RUNTIME_CONTROL") {
      enabled = message.action === "turnOn";
      sendResponse({ success: true });
      return true;
    }
    return false;
  });
})();
