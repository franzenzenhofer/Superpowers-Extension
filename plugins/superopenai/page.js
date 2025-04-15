// Assuming createPageBridge is loaded/available in this context
// (e.g., via import, script tag, or build process)
import { createPageBridge } from '/scripts/plugin_bridge.js'; // Added import

(function () {
  if (!window.Superpowers) window.Superpowers = {};
  if (!window.Superpowers.OpenAI) window.Superpowers.OpenAI = {};

  // Instantiate the bridge for 'superopenai'
  const openAIBridge = createPageBridge('superopenai');

  // Assign the bridge directly. The proxy handles method calls and events.
  window.Superpowers.OpenAI = openAIBridge;

  /*
  console.log("[superopenai/page.js] Initialized Superpowers.OpenAI bridge.");
  */
})();
