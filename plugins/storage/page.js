// plugins/storage/page.js
// Client-side interface to chrome.storage APIs

import { createPageBridge } from '../../scripts/plugin_bridge.js';

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  // Create the bridge for storage
  const bridge = createPageBridge('storage');
  
  // Create a more organized storage object structure
  const storage = {
    local: createAreaProxy('local'),
    sync: createAreaProxy('sync'),
    session: createAreaProxy('session'),
    on: bridge.on,
    off: bridge.off
  };
  
  // Create a proxy for each storage area (local, sync, session)
  function createAreaProxy(areaName) {
    return {
      get: (keys) => bridge[`${areaName}.get`](keys),
      set: (items) => bridge[`${areaName}.set`](items),
      remove: (keys) => bridge[`${areaName}.remove`](keys),
      clear: () => bridge[`${areaName}.clear`](),
      getBytesInUse: (keys) => bridge[`${areaName}.getBytesInUse`](keys)
    };
  }
  
  // Attach to window.Superpowers
  window.Superpowers.storage = storage;
})();
