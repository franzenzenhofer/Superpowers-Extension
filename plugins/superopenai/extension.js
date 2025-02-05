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
    /*
    console.log("[superopenai_extension] Installing in SW...");
    */

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
// In plugins/superopenai/extension.js, find the main onMessage listener below
// and replace it IN FULL with this version (no other changes needed):

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "SUPEROPENAI_CALL") return false;

  const { requestId, payload } = request;
  // console.log(`[superopenai_extension] #${requestId} => method: ${payload.method}`);

  let promise;

  switch (payload.method) {
    // For streaming:
    case "chatCompletionStream":
      promise = handleChatCompletionStream(payload, (partialChunk) => {
        const port = streamingPorts.get(requestId);
        if (!port) {
          console.debug("[superopenai_extension] Port no longer connected, skipping chunk.");
          return;
        }
        try {
          port.postMessage({ type: "STREAM_CHUNK", requestId, chunk: partialChunk });
        } catch (err) {
          console.debug("[superopenai_extension] Disconnected port error:", err.message);
          streamingPorts.delete(requestId);
        }
      });
      break;

    // Non-streaming Chat:
    case "chatCompletion":
      promise = handleChatCompletion(payload);
      break;

    // Images:
    case "imageGeneration":
      promise = handleImageGeneration(payload);
      break;

    // Etc. (structuredCompletion, functionCall, audio, embeddings, etc.):
    case "structuredCompletion":
      promise = handleStructuredCompletion(payload);
      break;
    case "functionCall":
      promise = handleFunctionCall(payload);
      break;
    case "audioSpeech":
      promise = handleAudioSpeech(payload);
      break;
    case "audioTranscription":
      promise = handleAudioTranscription(payload);
      break;
    case "audioTranslation":
      promise = handleAudioTranslation(payload);
      break;
    case "embeddings":
      promise = handleEmbeddings(payload);
      break;

    // Fine-tuning:
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

    // Files:
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

    // Models:
    case "modelList":
      promise = handleModelList(payload);
      break;
    case "modelRetrieve":
      promise = handleModelRetrieve(payload);
      break;
    case "modelDelete":
      promise = handleModelDelete(payload);
      break;

    // Batches:
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

    // Default: unrecognized method
    default:
      promise = Promise.reject(new Error("Unknown method for superopenai: " + payload.method));
  }

  if (promise) {
    promise
      .then((result) => {
        // [MINIMAL ADD] If it's "chatCompletion", attempt JSON parse once, then bracketed substring:
        if (payload.method === "chatCompletion" && result?.choices?.[0]?.message?.content) {
          const originalContent = result.choices[0].message.content;
          try {
            JSON.parse(originalContent); 
            // Already valid JSON, do nothing
          } catch (err1) {
            // Attempt bracketed substring
            const firstIdx = originalContent.indexOf("{");
            const lastIdx = originalContent.lastIndexOf("}");
            if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx) {
              const sub = originalContent.substring(firstIdx, lastIdx + 1);
              try {
                JSON.parse(sub);
                // If success, replace original
                result.choices[0].message.content = sub;
              } catch (err2) {
                // second parse also fails => keep original
              }
            }
          }
        }

        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error(`[superopenai_extension] #${requestId} => error:`, error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate async callback
  }

  // If we somehow get here
  return true;
});

  }
};
