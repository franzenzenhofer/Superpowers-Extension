// plugins/superwebrequest/page.js
// Minimal bridging from the real page => content => SW. 
// Exactly like superruntime, but for webRequest.

import { createPageBridge } from '../../scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  let enabled = false;

  function turnOn() {
    enabled = true;
    chrome.runtime.sendMessage({
      type: "SUPER_WEBREQUEST_CONTROL",
      action: "turnOn"
    });
  }

  function turnOff() {
    enabled = false;
    chrome.runtime.sendMessage({
      type: "SUPER_WEBREQUEST_CONTROL",
      action: "turnOff"
    });
  }

  // Create the bridge for superwebrequest
  const webrequestProxy = createPageBridge('superwebrequest');
  
  // Add control methods
  webrequestProxy.turnOn = turnOn;
  webrequestProxy.turnOff = turnOff;
  
  // Attach to window.Superpowers
  window.Superpowers.webrequest = webrequestProxy;

  // console.log("[superwebrequest/page.js] window.Superpowers.webrequest is ready");
})();
