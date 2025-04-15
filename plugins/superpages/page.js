// plugins/superpages/page.js
import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Instantiate the bridge for 'superpages'
  const pagesBridge = createPageBridge('superpages');

  // Assign the method using the bridge proxy.
  // The bridge handles the async call and response.
  window.Superpowers.pages = (content, options = {}) => {
    // Call a method named 'createBlobUrl' on the bridge,
    // passing content and options.
    return pagesBridge.createBlobUrl(content, options);
  };

  /*
  console.log("[superpages/page.js] Superpowers.pages() bridge ready");
  */
})();
