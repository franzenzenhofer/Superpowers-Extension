import {
  handleChatCompletion,
  handleImageGeneration,
  handleStructuredCompletion,
  handleFunctionCall
} from "./openai.js";

export const superopenai_extension = {
  name: "superopenai_extension",

  install(context) {
    if (context.debug) {
      console.log("[superopenai_extension] Installing in SW...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPEROPENAI_CALL") return false;
      const { requestId, payload } = request;
      console.log(`[superopenai_extension] #${requestId} => payload:`, payload);

      if (payload.method === "test") {
        // Simulate async operation
        setTimeout(() => {
          sendResponse({ 
            success: true, 
            result: "test success" 
          });
        }, 500);
        return true; // Keep channel open for async
      }

      let promise;
      switch (payload.method) {
        case "chatCompletion":
          promise = handleChatCompletion(payload);
          break;
        case "imageGeneration":
          promise = handleImageGeneration(payload);
          break;
        case "structuredCompletion":
          promise = handleStructuredCompletion(payload);
          break;
        case "functionCall":
          promise = handleFunctionCall(payload);
          break;
        default:
          promise = Promise.reject(new Error("Unknown method for superopenai: " + payload.method));
      }

      promise
        .then((result) => {
          console.log(`[superopenai_extension] #${requestId} => returning success`);
          sendResponse({ success: true, result });
        })
        .catch((error) => {
          console.error(`[superopenai_extension] #${requestId} => error:`, error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep channel open for async
    });
  }
};