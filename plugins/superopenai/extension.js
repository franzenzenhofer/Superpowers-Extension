/**
 * extension.js
 * ---------------------------------------------
 * The service worker / background script bridging logic.
 * We add a new "chatCompletionStream" method for streaming partial tokens.
 */

import {
  setApiKey,
  setOrganizationId,
  handleChatCompletion,
  handleChatCompletionStream,
  handleImageGeneration,
  handleStructuredCompletion,
  handleFunctionCall,
  handleAudioSpeech,
  handleAudioTranscription,
  handleAudioTranslation,
  handleEmbeddings,
  handleFineTuneCreate,
  handleFineTuneList,
  handleFineTuneRetrieve,
  handleFineTuneCancel,
  handleFineTuneListEvents,
  handleFineTuneListCheckpoints,
  handleFileUpload,
  handleFileList,
  handleFileRetrieve,
  handleFileDelete,
  handleFileContent,
  handleModelList,
  handleModelRetrieve,
  handleModelDelete,
  handleBatchCreate,
  handleBatchRetrieve,
  handleBatchCancel,
  handleBatchList
} from "./openai.js";

export const superopenai_extension = {
  name: "superopenai_extension",

  install(context) {
    if (context.debug) {
      console.log("[superopenai_extension] Installing in SW...");
    }

    // Map of requestId => Port (for streaming chunks)
    const streamingPorts = new Map();

    // 1) Listen for a long-lived connection from the content script
    chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener((msg) => {
        if (msg.type === "INIT_STREAM_PORT") {
          const { requestId } = msg;
          streamingPorts.set(requestId, port);
          console.log(`[superopenai_extension] Bound streaming port for requestId=${requestId}`);
        }
      });

      port.onDisconnect.addListener(() => {
        for (const [reqId, p] of streamingPorts.entries()) {
          if (p === port) {
            streamingPorts.delete(reqId);
            break;
          }
        }
      });
    });

    // 2) Listen for SUPEROPENAI_CALL messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPEROPENAI_CALL") return false;
      const { requestId, payload } = request;
      console.log(`[superopenai_extension] #${requestId} => method: ${payload.method}`);

      // Handle config or test first
      if (payload.method === "setApiKey") {
        try {
          setApiKey(payload.key);
          sendResponse({ success: true, result: "API key set" });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return false;
      }

      if (payload.method === "setOrganizationId") {
        try {
          setOrganizationId(payload.orgId);
          sendResponse({ success: true, result: "Organization ID set" });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return false;
      }

      if (payload.method === "test") {
        setTimeout(() => {
          sendResponse({ success: true, result: "test success" });
        }, 500);
        return true; // async
      }

      let promise;
      switch (payload.method) {
        /**
         * NEW: Streaming chat
         */
        case "chatCompletionStream":
          promise = handleChatCompletionStream(payload, (partialChunk) => {
            // forward partial chunk to the correct port
            const port = streamingPorts.get(requestId);
            if (port) {
              port.postMessage({
                type: "STREAM_CHUNK",
                requestId,
                chunk: partialChunk
              });
            }
          });
          break;

        // Non-streaming Chat
        case "chatCompletion":
          promise = handleChatCompletion(payload);
          break;

        // Images
        case "imageGeneration":
          promise = handleImageGeneration(payload);
          break;

        // Structured completion
        case "structuredCompletion":
          promise = handleStructuredCompletion(payload);
          break;

        // Functions
        case "functionCall":
          promise = handleFunctionCall(payload);
          break;

        // Audio
        case "audioSpeech":
          promise = handleAudioSpeech(payload);
          break;
        case "audioTranscription":
          promise = handleAudioTranscription(payload);
          break;
        case "audioTranslation":
          promise = handleAudioTranslation(payload);
          break;

        // Embeddings
        case "embeddings":
          promise = handleEmbeddings(payload);
          break;

        // Fine-tuning
        case "fineTuneCreate":
          promise = handleFineTuneCreate(payload);
          break;
        case "fineTuneList":
          promise = handleFineTuneList(payload);
          break;
        case "fineTuneRetrieve":
          promise = handleFineTuneRetrieve(payload);
          break;
        case "fineTuneCancel":
          promise = handleFineTuneCancel(payload);
          break;
        case "fineTuneListEvents":
          promise = handleFineTuneListEvents(payload);
          break;
        case "fineTuneListCheckpoints":
          promise = handleFineTuneListCheckpoints(payload);
          break;

        // Files
        case "fileUpload":
          promise = handleFileUpload(payload);
          break;
        case "fileList":
          promise = handleFileList(payload);
          break;
        case "fileRetrieve":
          promise = handleFileRetrieve(payload);
          break;
        case "fileDelete":
          promise = handleFileDelete(payload);
          break;
        case "fileContent":
          promise = handleFileContent(payload);
          break;

        // Models
        case "modelList":
          promise = handleModelList(payload);
          break;
        case "modelRetrieve":
          promise = handleModelRetrieve(payload);
          break;
        case "modelDelete":
          promise = handleModelDelete(payload);
          break;

        // Batches
        case "batchCreate":
          promise = handleBatchCreate(payload);
          break;
        case "batchRetrieve":
          promise = handleBatchRetrieve(payload);
          break;
        case "batchCancel":
          promise = handleBatchCancel(payload);
          break;
        case "batchList":
          promise = handleBatchList(payload);
          break;

        default:
          promise = Promise.reject(new Error("Unknown method for superopenai: " + payload.method));
      }

      // 3) When promise finishes, send final response
      promise
        .then((result) => {
          console.log(`[superopenai_extension] #${requestId} => returning success`);
          sendResponse({ success: true, result });
        })
        .catch((error) => {
          console.error(`[superopenai_extension] #${requestId} => error:`, error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Indicate asynchronous
    });
  }
};
