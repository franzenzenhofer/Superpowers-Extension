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
  handleBatchList
} from "./openai.js";

export const superopenai_extension = {
  name: "superopenai_extension",

  async install(context) {
    console.log("[superopenai_extension] Installing in service worker...");

    let keyInitialized = false;
    
    // Try to initialize OpenAI API key - make up to 2 attempts
    // This is a best-effort attempt; runtime API calls will retry loading if needed
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[superopenai_extension] Initial key check (attempt ${attempt + 1})...`);
        keyInitialized = await initializeOpenAIKey();
        
        if (keyInitialized) {
          console.log("[superopenai_extension] API key successfully initialized during install");
          break;
        } else if (attempt === 0) {
          console.warn("[superopenai_extension] API key not found on first attempt, will retry shortly");
          // Wait a moment before retry - superenv might still be initializing
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`[superopenai_extension] Error during initial API key check (attempt ${attempt + 1}):`, err);
        if (attempt === 0) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!keyInitialized) {
      console.warn("[superopenai_extension] No API key found during install - this is expected if key hasn't been set yet");
      console.info("[superopenai_extension] Extension will still be available and API calls will load key when needed");
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
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async work
        return "test success";
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

    return extensionBridge;
  }
};

/**
 * Initializes the OpenAI API key from superenv.
 * This is a best-effort initial check during plugin installation.
 * Runtime API calls will retry key loading if needed.
 */
async function initializeOpenAIKey() {
  console.log("[superopenai] Initializing OpenAI API key (best-effort)...");
  
  // PRIMARY: Try to get environment variables from superenv
  try {
    console.log("[superopenai] Primary: Requesting API key from superenv");
    // Get environment variables from superenv
    const envVars = await fetchEnvVarsFromSuperenv();
    
    if (envVars && envVars.OPENAI_API_KEY) {
      setApiKey(envVars.OPENAI_API_KEY);
      console.log("[superopenai] Successfully loaded OpenAI API key from superenv");
      
      // Optionally set organization ID if it exists
      if (envVars.OPENAI_ORGANIZATION_ID) {
        setOrganizationId(envVars.OPENAI_ORGANIZATION_ID);
        console.log("[superopenai] OpenAI organization ID loaded from superenv");
      }
      
      return true;
    } else {
      console.warn("[superopenai] superenv response received but no OPENAI_API_KEY found");
      // Initialization during plugin load may legitimately fail if user hasn't set key yet
      // This is expected and not a critical error - runtime calls will retry loading
    }
  } catch (err) {
    console.error("[superopenai] Failed to load API key from superenv:", err);
    // Continue with fallbacks
  }
  
  // FALLBACK: Direct storage access (only if superenv failed or didn't have the key)
  console.log("[superopenai] Falling back to direct storage access");
  
  try {
    console.log("[superopenai] Directly accessing chrome.storage.local for superEnvVars");
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get("superEnvVars", (result) => {
        if (chrome.runtime.lastError) {
          console.error("[superopenai] Error reading from storage:", chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
    
    if (storageData && storageData.superEnvVars && storageData.superEnvVars.default) {
      const defaultVars = storageData.superEnvVars.default;
      
      if (defaultVars.OPENAI_API_KEY) {
        setApiKey(defaultVars.OPENAI_API_KEY);
        console.log("[superopenai] Successfully loaded OpenAI API key directly from storage");
        
        if (defaultVars.OPENAI_ORGANIZATION_ID) {
          setOrganizationId(defaultVars.OPENAI_ORGANIZATION_ID);
          console.log("[superopenai] OpenAI organization ID loaded from storage");
        }
        
        return true;
      } else {
        console.warn("[superopenai] No API key found in direct storage access");
      }
    } else {
      console.warn("[superopenai] No valid storage data found for superEnvVars");
    }
  } catch (storageErr) {
    console.error("[superopenai] Error during direct storage access:", storageErr);
  }
  
  // Final fallback: Check for dedicated API key storage
  try {
    console.log("[superopenai] Checking for dedicated API key storage");
    const dedicatedKeyData = await new Promise((resolve) => {
      chrome.storage.local.get("openaiApiKey", (result) => {
        if (chrome.runtime.lastError) {
          console.error("[superopenai] Error reading dedicated key storage:", chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
    
    if (dedicatedKeyData && dedicatedKeyData.openaiApiKey) {
      setApiKey(dedicatedKeyData.openaiApiKey);
      console.log("[superopenai] Successfully loaded OpenAI API key from dedicated storage");
      return true;
    } else {
      console.warn("[superopenai] No API key found in dedicated storage");
    }
  } catch (dedicatedErr) {
    console.error("[superopenai] Error checking dedicated API key storage:", dedicatedErr);
  }
  
  console.warn("[superopenai] Initial API key loading failed - this is expected if key hasn't been set yet");
  return false;
}

/**
 * Helper function to fetch environment variables from superenv.
 * Separated for better error handling and potential reuse.
 * @export - Available to other modules that import this one
 */
export async function fetchEnvVarsFromSuperenv() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SUPERENV_GET_VARS" },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (!response) {
          reject(new Error("No response received from superenv"));
          return;
        }
        
        if (response.success === false) {
          reject(new Error(response.error || "Unknown error from superenv"));
          return;
        }
        
        // Success case
        resolve(response.success && response.result ? response.result : {});
      }
    );
  });
}
