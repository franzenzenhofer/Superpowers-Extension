// plugins/superscreenshot/page.js
// Exposes an async function Superpowers.screenshot(urlOrObjOrNothing) that returns a Promise.
// The messaging logic is EXACTLY like superpingasync/page.js, just with "SUPERSCREENSHOT".

import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  // Instantiate the bridge for 'superscreenshot'
  const screenshotBridge = createPageBridge('superscreenshot');

  // Assign the method directly using the bridge proxy.
  // The bridge handles the async call and response.
  // Note: The bridge itself has a built-in timeout (30s by default).
  window.Superpowers.screenshot = (...args) => {
    // The bridge proxy expects the method name as the property
    // and arguments passed to the function call.
    // Since we only have one core function, we can name the method 'capture'.
    return screenshotBridge.capture(...args);
  };

  /*
  console.log("[superscreenshot/page.js] Superpowers.screenshot() bridge ready");
  */
})();

// The old manual Promise, listener, and postMessage logic is removed.
