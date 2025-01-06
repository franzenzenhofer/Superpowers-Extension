import {
    // Existing
    handleChatCompletion,
    handleImageGeneration,
    handleStructuredCompletion,
    handleFunctionCall,
    setApiKey,
    setOrganizationId,
  
    // Audio
    handleAudioSpeech,
    handleAudioTranscription,
    handleAudioTranslation,
  
    // Embeddings
    handleEmbeddings,
  
    // Fine-tuning
    handleFineTuneCreate,
    handleFineTuneList,
    handleFineTuneRetrieve,
    handleFineTuneCancel,
    handleFineTuneListEvents,
    handleFineTuneListCheckpoints,
  
    // Files
    handleFileUpload,
    handleFileList,
    handleFileRetrieve,
    handleFileDelete,
    handleFileContent,
  
    // Models
    handleModelList,
    handleModelRetrieve,
    handleModelDelete,
  
    // Batches
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
  
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type !== "SUPEROPENAI_CALL") return false;
        const { requestId, payload } = request;
        console.log(`[superopenai_extension] #${requestId} => payload:`, payload);
  
        // Handle configuration methods
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
          // Existing
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
  