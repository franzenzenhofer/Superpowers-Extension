import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  // Instantiate the bridge for 'superurlget'
  const urlgetBridge = createPageBridge('superurlget');

  // Assign the bridge directly to the Urlget namespace.
  // Method calls like Superpowers.Urlget.getRenderedPage(...) will be proxied.
  // Event listeners can be attached via Superpowers.Urlget.on('eventName', callback)
  window.Superpowers.Urlget = urlgetBridge;

  /*
  console.debug('[superurlget/page.js] Initialized Superpowers.Urlget bridge.');
  */
})();

// The old callMethod helper and manual event/response listeners are removed.
