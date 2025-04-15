// plugins/superpages/extension.js
export const superpages_extension = {
  name: "superpages_extension",

  install(context) {
    const SW_ACK_TYPE = 'SUPERPAGES_ACK'; // Match the type sent by content.js

    // Listen for SUPERPAGES_ACK requests from the content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== SW_ACK_TYPE) return false;

      // Minimal: just acknowledge success to let content.js do the blob creation
      // console.log(`[superpages_extension] Acknowledging request ${request.requestId}`);
      sendResponse({ success: true, message: "Acknowledged" });
      
      // No need to return true, sendResponse is called synchronously here.
      return false; 
    });

    /*
    console.log("[superpages_extension] Ready to acknowledge SUPERPAGES_ACK.");
    */
  }
};
