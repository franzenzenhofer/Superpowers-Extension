import { createPageBridge } from '/scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  // Instantiate the bridge
  const readmeBridge = createPageBridge('superreadme');

  // Assign the methods using the bridge proxy
  window.Superpowers.readme = {
    getLLMReadme: () => readmeBridge.getLLMReadme(),
    getMainReadme: () => readmeBridge.getMainReadme()
  };

  /*
  console.log("[superreadme/page.js] Superpowers.readme bridge ready");
  */
})();
