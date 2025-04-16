/**
 * extension.js
 * ---------------------------------------------
 * The service worker / background script bridging logic.
 * We add a new "chatCompletionStream" method for streaming partial tokens.
 */

import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

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
  handleBatchList,
  ensureApiKeyLoaded
} from "./openai.js";

export const superopenai_extension = {
  name: "superopenai_extension",

  async install(context) {
    console.log("[superopenai_extension] Installing in service worker...");
    
    // Attempt to initialize the API key but don't block installation if it fails
    // The key will be loaded on-demand when needed for API calls
    try {
      const keyInitialized = await ensureApiKeyLoaded();
      if (keyInitialized) {
        console.log("[superopenai_extension] API key successfully initialized during install");
      } else {
        console.log("[superopenai_extension] No API key found during install (this is normal if not set yet)");
      }
    } catch (err) {
      console.warn("[superopenai_extension] Error during initial key setup:", err);
      // Continue with installation even if key setup fails
    }

    // Define method handlers for the extension bridge
    const methodHandlers = {
      // Config methods - Note: Bridge passes (methodName, args, sender, requestId)
      setApiKey: async (methodName, args) => {
        if (!args || typeof args[0] !== 'string') {
          throw new Error("API key must be provided as the first argument.");
        }
        setApiKey(args[0]);
        console.log("[superopenai_extension] API key set via direct method call");
        return "API key set"; // Return success message
      },
      setOrganizationId: (methodName, args) => {
        if (!args || typeof args[0] !== 'string') {
          throw new Error("Organization ID must be provided as the first argument.");
        }
        setOrganizationId(args[0]);
        return "Organization ID set";
      },
      test: async (methodName, args) => {
        await new Promise(resolve => setTimeout(resolve, 100)); 
        return "OpenAI extension is operational";
      },

      // Core API methods - Bridge passes (methodName, args, sender, requestId)
      chatCompletion: (methodName, args, sender) => handleChatCompletion(args[0] || {}), // Assuming payload is first arg
      imageGeneration: (methodName, args) => handleImageGeneration(args[0] || {}),
      structuredCompletion: (methodName, args) => handleStructuredCompletion(args[0] || {}),
      functionCall: (methodName, args) => handleFunctionCall(args[0] || {}),

      // Audio methods
      audioSpeech: (methodName, args) => handleAudioSpeech(args[0] || {}),
      audioTranscription: (methodName, args) => handleAudioTranscription(args[0] || {}),
      audioTranslation: (methodName, args) => handleAudioTranslation(args[0] || {}),

      // Embeddings
      embeddings: (methodName, args) => handleEmbeddings(args[0] || {}),

      // Fine-tuning
      fineTuneCreate: (methodName, args) => handleFineTuneCreate(args[0] || {}),
      fineTuneList: (methodName, args) => handleFineTuneList(args[0] || {}),
      fineTuneRetrieve: (methodName, args) => handleFineTuneRetrieve(args[0] || {}),
      fineTuneCancel: (methodName, args) => handleFineTuneCancel(args[0] || {}),
      fineTuneListEvents: (methodName, args) => handleFineTuneListEvents(args[0] || {}),
      fineTuneListCheckpoints: (methodName, args) => handleFineTuneListCheckpoints(args[0] || {}),

      // Files
      fileUpload: (methodName, args) => handleFileUpload(args[0] || {}),
      fileList: (methodName, args) => handleFileList(args[0] || {}),
      fileRetrieve: (methodName, args) => handleFileRetrieve(args[0] || {}),
      fileDelete: (methodName, args) => handleFileDelete(args[0] || {}),
      fileContent: (methodName, args) => handleFileContent(args[0] || {}),

      // Models
      modelList: (methodName, args) => handleModelList(args[0] || {}),
      modelRetrieve: (methodName, args) => handleModelRetrieve(args[0] || {}),
      modelDelete: (methodName, args) => handleModelDelete(args[0] || {}),

      // Batches
      batchCreate: (methodName, args) => handleBatchCreate(args[0] || {}),
      batchRetrieve: (methodName, args) => handleBatchRetrieve(args[0] || {}),
      batchCancel: (methodName, args) => handleBatchCancel(args[0] || {}),
      batchList: (methodName, args) => handleBatchList(args[0] || {}),

      // Streaming - Special handling to pass broadcastEvent and requestId
      chatCompletionStream: (methodName, args, sender, requestId) => {
        // We need the broadcastEvent function from the bridge
        // The bridge itself returns { broadcastEvent }, so we call it here.
        const { broadcastEvent } = extensionBridge; // Access broadcastEvent from the initialized bridge
        return handleChatCompletionStream(args[0] || {}, sender, requestId, broadcastEvent);
      },
    };

    // Create the extension bridge
    const extensionBridge = createExtensionBridge({
      pluginName: 'superopenai',
      methodHandlers,
    });

    // Set up storage change listener to update API key if changed in storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.superEnvVars && 
          changes.superEnvVars.newValue?.default?.OPENAI_API_KEY !== 
          changes.superEnvVars.oldValue?.default?.OPENAI_API_KEY) {
        
        console.log("[superopenai] Detected API key change in storage");
        const newKey = changes.superEnvVars.newValue?.default?.OPENAI_API_KEY;
        if (newKey) {
          setApiKey(newKey);
          console.log("[superopenai] Updated API key from storage change");
          
          // Update organization ID if present
          const newOrgId = changes.superEnvVars.newValue?.default?.OPENAI_ORGANIZATION_ID;
          if (newOrgId) {
            setOrganizationId(newOrgId);
            console.log("[superopenai] Updated organization ID from storage change");
          }
        }
      }
    });

    return extensionBridge;
  }
};
