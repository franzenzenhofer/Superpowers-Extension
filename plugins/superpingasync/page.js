import { createPageBridge } from '/scripts/plugin_bridge.js';

(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Instantiate the bridge
  const pingBridge = createPageBridge('superpingasync');

  // Assign the method using the bridge proxy
  window.Superpowers.asyncPing = (message) => {
    // Call the 'ping' method on the bridge
    return pingBridge.ping(message);
  };

  // console.log("[superpingasync/page.js] Superpowers.asyncPing(...) bridge ready");
})();