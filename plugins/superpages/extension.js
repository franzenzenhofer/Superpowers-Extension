// plugins/superpages/extension.js
export const superpages_extension = {
  name: "superpages_extension",

  install(context) {
    // Listen for SUPERPAGES requests from the content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERPAGES") return false;

      // Minimal: just echo success to let content.js do the blob creation
      sendResponse({ success: true });
      return true; // Indicate an async response
    });
  }
};
