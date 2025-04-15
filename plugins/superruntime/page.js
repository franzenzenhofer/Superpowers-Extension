// plugins/superruntime/page.js
import { createPageBridge } from '../../scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  let enabled = false;

  function turnOn() {
    enabled = true;
    chrome.runtime.sendMessage({
      type: "SUPER_RUNTIME_CONTROL",
      action: "turnOn"
    });
  }

  function turnOff() {
    enabled = false;
    chrome.runtime.sendMessage({
      type: "SUPER_RUNTIME_CONTROL",
      action: "turnOff"
    });
  }

  // Create the bridge for superruntime
  const runtimeProxy = createPageBridge('superruntime');
  
  // Add control methods
  runtimeProxy.turnOn = turnOn;
  runtimeProxy.turnOff = turnOff;
  
  // Attach to window.Superpowers
  window.Superpowers.runtime = runtimeProxy;
})();
