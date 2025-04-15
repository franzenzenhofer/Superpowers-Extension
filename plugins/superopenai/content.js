/**
 * content.js
 * ---------------------------------------------
 * Runs in the content-script context. It:
 *   1) Creates a long-lived Port to the background script for streaming.
 *   2) For streaming requests, sends "INIT_STREAM_PORT" so the background can map requestId => Port.
 *   3) Forwards partial chunks from background => the page as SUPEROPENAI_STREAM_CHUNK.
 *   4) Forwards final response or error as SUPEROPENAI_RESPONSE.
 */

import { createContentBridge } from '/scripts/plugin_bridge.js';

(function() {
  // Initialize the content bridge for 'superopenai'
  // This handles forwarding messages between the page and the extension service worker,
  // including listening for broadcasted events (which will be used for stream chunks).
  createContentBridge('superopenai');

  /*
  console.log("[superopenai/content.js] Content bridge initialized.");
  */
})();

// The previous logic for handling SUPEROPENAI_CALL, SUPEROPENAI_RESPONSE,
// managing the chrome.runtime.connect port for streaming, and forwarding
// SUPEROPENAI_STREAM_CHUNK messages has been replaced by the bridge.
