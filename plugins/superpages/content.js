// plugins/superpages/content.js - Special Handling
// This script listens for bridge calls, forwards to SW for acknowledgment,
// then creates the Blob URL *after* successful acknowledgment.

(function() {
  const CALL_TYPE = 'SUPER_superpages_CALL'; // Matches createPageBridge('superpages')
  const RESPONSE_TYPE = 'SUPER_superpages_RESPONSE'; // Matches createPageBridge('superpages')
  const SW_ACK_TYPE = 'SUPERPAGES_ACK'; // Custom type for SW internal acknowledgment

  // Store blob URLs temporarily to revoke later if needed (basic cleanup)
  const createdBlobUrls = new Set();

  // 1. Listen for calls forwarded by the page bridge
  window.addEventListener("message", (event) => {
    if (!event.data || 
        event.data.direction !== "from-page" || 
        event.data.type !== CALL_TYPE) {
      return;
    }

    const { requestId, methodName, args } = event.data;

    // We only expect 'createBlobUrl' method from the page.js refactor
    if (methodName !== 'createBlobUrl') {
       console.warn(`[superpages/content.js] Received unexpected method: ${methodName}`);
       // Send an error response back via the bridge pattern
       window.postMessage({
         direction: "from-content-script",
         type: RESPONSE_TYPE,
         requestId,
         success: false,
         error: `Unknown method: ${methodName}`
       }, "*");
       return;
    }

    // Extract original arguments needed for blob creation
    const content = args[0];
    const options = args[1] || {};
    const { filename, mimeType } = options;

    // 2. Forward to SW for acknowledgment (using a custom type)
    chrome.runtime.sendMessage({
      type: SW_ACK_TYPE, // Custom type for SW
      requestId, // Pass requestId for correlation if needed by SW
      // SW doesn't need content/options, just needs to know a request happened
    }, (response) => {
      // 3. Handle SW response (ack or error)
      if (chrome.runtime.lastError) {
        // SW communication error
        window.postMessage({
          direction: "from-content-script",
          type: RESPONSE_TYPE, // Use bridge response type
          requestId,
          success: false,
          error: `Extension communication error: ${chrome.runtime.lastError.message}`
        }, "*");
        return;
      }

      if (!response || !response.success) {
        // SW rejected the request or had an internal error
        const errMsg = response?.error || "Extension failed to acknowledge request.";
         window.postMessage({
          direction: "from-content-script",
          type: RESPONSE_TYPE, // Use bridge response type
          requestId,
          success: false,
          error: errMsg
        }, "*");
        return;
      }

      // --- SW Acknowledgment Successful --- 

      // 4. Create Blob and URL in the content script
      try {
        const type = mimeType || "text/plain"; // Default mime type
        const blob = new Blob([content !== undefined ? content : ''], { type });
        const blobUrl = URL.createObjectURL(blob);
        createdBlobUrls.add(blobUrl); // Track for potential cleanup

        // Basic cleanup: Revoke oldest URL if too many exist
        if (createdBlobUrls.size > 50) { 
            const oldestUrl = createdBlobUrls.values().next().value;
            URL.revokeObjectURL(oldestUrl);
            createdBlobUrls.delete(oldestUrl);
        }

        // 5. Send success response *with Blob URL* back to page bridge
        window.postMessage({
          direction: "from-content-script",
          type: RESPONSE_TYPE, // Use bridge response type
          requestId,
          success: true,
          result: blobUrl, // The result is the Blob URL
          // filename // Can include filename if page needs it, but page.js doesn't currently use it
        }, "*");

      } catch (blobError) {
         console.error("[superpages/content.js] Error creating Blob:", blobError);
         // Send blob creation error back to page bridge
         window.postMessage({
            direction: "from-content-script",
            type: RESPONSE_TYPE, // Use bridge response type
            requestId,
            success: false,
            error: `Failed to create blob: ${blobError.message}`
          }, "*");
      }
    });
  });

  // NOTE: No listener for events from SW needed for this plugin's core function.
  // If events were added later, a chrome.runtime.onMessage listener would be needed here,
  // similar to the standard createContentBridge, to forward SW events to the page.
})();
