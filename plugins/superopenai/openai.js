/**
 * openai.js
 * ---------------------------------------------
 * Contains all logic for interacting with the OpenAI API
 * (including the new SSE streaming logic for "chatCompletionStream".)
 */

// Import the fetchEnvVarsFromSuperenv helper from extension.js
import { fetchEnvVarsFromSuperenv } from './extension.js';

const OPENAI_API_BASE = "https://api.openai.com/v1";

// In-memory config
let _apiKey = null;
let _organizationId = null;

const MODEL_CONFIGS = {
  'o1':         { maxTokens: 100000, temperature: 1,   matches: ['o1','o1-'] },
  'o1-mini':    { maxTokens: 65536,  temperature: 1,   matches: ['o1-mini'] },
  'o1-preview': { maxTokens: 32768,  temperature: 1,   matches: ['o1-preview'] },
  'gpt-4o':     { maxTokens: 16384,  temperature: 0.7, matches: ['gpt-4o','gpt4o'] },
  'gpt-4o-mini':{ maxTokens: 16384,  temperature: 0.7, matches: ['gpt-4o-mini','gpt4o-mini'] },
  'o3-mini':    { maxTokens: 100000, temperature: 1,   matches: ['o3-mini','o3'] }
};

function getModelConfig(model) {
  const lcModel = model.toLowerCase();
  let modelKey = 'gpt-4o'; // default
  let bestLen = 0;
  
  Object.entries(MODEL_CONFIGS).forEach(([key, cfg]) => {
    for (const m of cfg.matches) {
      if (lcModel.includes(m) && m.length > bestLen) {
        modelKey = key;
        bestLen = m.length;
      }
    }
  });
  
  return MODEL_CONFIGS[modelKey] || MODEL_CONFIGS['gpt-4o'];
}

/**
 * Store the user's API key
 */
export function setApiKey(key) {
  _apiKey = key;
}

/**
 * Store the user's organization ID
 */
export function setOrganizationId(orgId) {
  _organizationId = orgId;
}

/**
 * A helper for normal (non-stream) fetch calls
 */
async function openaiFetch(path, options = {}) {
  // Try up to 2 times to load the API key if it's missing
  let keyLoaded = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!_apiKey) {
      console.log(`[OpenAI] No API key set, attempt ${attempt + 1} to load`);
      
      try {
        // Use our new hierarchical API key loading function
        keyLoaded = await ensureApiKeyLoaded();
        
        if (keyLoaded) {
          console.log("[OpenAI] Successfully loaded API key");
          break; // Key loaded successfully, exit the retry loop
        } else if (attempt === 0) {
          // Only log this on first attempt to avoid spam
          console.warn("[OpenAI] Failed to load API key, will retry once before failing");
          // Small delay before retrying to allow for any async storage operations to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        console.error("[OpenAI] Error during API key loading attempt:", err);
      }
    } else {
      keyLoaded = true;
      break; // Key already exists, no need for second attempt
    }
  }

  // Final check - fail if no key after attempts
  if (!_apiKey) {
    console.error("[OpenAI] API key still not available after retry attempts");
    throw new Error("No API key set for OpenAI! Please setApiKey(...) first or store in environment variables.");
  }

  const url = `${OPENAI_API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${_apiKey}`
  };
  if (_organizationId) {
    headers["OpenAI-Organization"] = _organizationId;
  }

  try {
    // Log outgoing request payload
    console.log("🤖 🔄 🌐 ⚡️ 📡"); // Visual separator for important API calls

    console.log('[OpenAI] Outgoing request:', {
      endpoint: path,
      method: options.method || 'GET',
      payload: options.body ? JSON.parse(options.body) : undefined
    });

    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      
      // Special case for authentication errors - might need to reload API key
      if (res.status === 401) {
        console.error("[OpenAI] Authentication error (401) - API key may be invalid or expired");
        // Clear the key so next request will try to reload it from superenv
        _apiKey = null;
        console.log("[OpenAI] API key cleared - will try to reload from superenv on next request");
      }
      
      const error = new Error(`OpenAI API Error (${res.status}): ${errorBody.error?.message || "Unknown error"}`);
      error.status = res.status;
      error.endpoint = path;
      error.method = options.method || "GET";
      error.requestBody = options.body ? JSON.parse(options.body) : undefined;
      error.responseBody = errorBody;
      throw error;
    }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timeout for ${path}`);
    }
    if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      throw new Error(`Network error while calling ${path}. Check your internet connection.`);
    }
    throw err;
  }
}

/**
 * Attempts to load the OpenAI API key, following a clear hierarchy:
 * 1. First try to get it from superenv (the source of truth)
 * 2. Only if superenv fails or doesn't have the key, try direct storage access
 * 
 * @returns {Promise<boolean>} True if key was loaded successfully
 */
async function ensureApiKeyLoaded() {
  if (_apiKey) {
    return true; // Key already loaded
  }
  
  console.log("[OpenAI] No API key set, attempting to load from superenv first");
  
  // ATTEMPT 1 (PRIMARY): Use superenv as the source of truth
  try {
    console.log("[OpenAI] PRIMARY: Requesting environment variables from superenv");
    // Send a message to superenv to get environment variables
    const envVars = await new Promise((resolve, reject) => {
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
    
    // Check if we got the API key from superenv
    if (envVars && envVars.OPENAI_API_KEY) {
      console.log("[OpenAI] Successfully retrieved API key from superenv");
      setApiKey(envVars.OPENAI_API_KEY);
      
      // Also set org ID if available
      if (envVars.OPENAI_ORGANIZATION_ID) {
        setOrganizationId(envVars.OPENAI_ORGANIZATION_ID);
        console.log("[OpenAI] Also loaded organization ID from superenv");
      }
      
      return true;
    } else {
      console.warn("[OpenAI] superenv responded but no API key was found");
      // Continue to fallback
    }
  } catch (err) {
    console.error("[OpenAI] Failed to get API key from superenv:", err);
    // Continue to fallback
  }
  
  // ATTEMPT 2 (FALLBACK): Direct storage access if superenv failed or didn't have the key
  console.log("[OpenAI] FALLBACK: Attempting direct storage access");
  
  // Try direct access to superEnvVars
  try {
    console.log("[OpenAI] Directly accessing chrome.storage.local for superEnvVars");
    const result = await new Promise((resolve) => {
      chrome.storage.local.get("superEnvVars", (result) => {
        if (chrome.runtime.lastError) {
          console.error("[OpenAI] Storage error:", chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
    
    if (result && result.superEnvVars && result.superEnvVars.default) {
      const defaultVars = result.superEnvVars.default;
      if (defaultVars.OPENAI_API_KEY) {
        console.log("[OpenAI] Successfully retrieved API key directly from chrome.storage.local");
        setApiKey(defaultVars.OPENAI_API_KEY);
        
        // Also set org ID if available
        if (defaultVars.OPENAI_ORGANIZATION_ID) {
          setOrganizationId(defaultVars.OPENAI_ORGANIZATION_ID);
          console.log("[OpenAI] Also loaded organization ID");
        }
        
        return true;
      } else {
        console.warn("[OpenAI] API key not found in direct superEnvVars access");
      }
    } else {
      console.warn("[OpenAI] No valid superEnvVars found in storage");
    }
  } catch (err) {
    console.error("[OpenAI] Error during direct superEnvVars access:", err);
  }
  
  // Last resort: Check for dedicated API key storage
  try {
    console.log("[OpenAI] Checking for dedicated API key storage");
    const dedicatedResult = await new Promise((resolve) => {
      chrome.storage.local.get("openaiApiKey", (result) => {
        if (chrome.runtime.lastError) {
          console.error("[OpenAI] Dedicated storage error:", chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
    
    if (dedicatedResult && dedicatedResult.openaiApiKey) {
      console.log("[OpenAI] Found API key in dedicated storage");
      setApiKey(dedicatedResult.openaiApiKey);
      return true;
    } else {
      console.warn("[OpenAI] No dedicated API key storage found");
    }
  } catch (err) {
    console.error("[OpenAI] Error checking dedicated API key storage:", err);
  }
  
  console.error("[OpenAI] All API key loading strategies failed");
  return false;
}

/**
 * If we're using an o1 or o1-mini model, forcibly remove/override certain params
 * (presence_penalty, frequency_penalty, etc.), force temperature=1, rename system->developer if no developer role found
 */
function preprocessForO1(requestBody) {
  // Remove unsupported or forcibly override certain parameters
  if (typeof requestBody.presence_penalty !== "undefined") {
    delete requestBody.presence_penalty;
  }
  if (typeof requestBody.frequency_penalty !== "undefined") {
    delete requestBody.frequency_penalty;
  }
  if (typeof requestBody.logit_bias !== "undefined") {
    delete requestBody.logit_bias;
  }
  if (typeof requestBody.logprobs !== "undefined") {
    delete requestBody.logprobs;
  }
  if (typeof requestBody.top_logprobs !== "undefined") {
    delete requestBody.top_logprobs;
  }
  if (typeof requestBody.n !== "undefined") {
    delete requestBody.n;
  }
  if (typeof requestBody.stream !== "undefined") {
    delete requestBody.stream;
  }

  // Force temperature=1
  if (requestBody.temperature !== 1) {
    if (typeof requestBody.temperature !== "undefined") {
      console.log(`[o1] Overriding user temperature=${requestBody.temperature} to 1`);
    }
    requestBody.temperature = 1;
  }

  // Commented out: system->developer role renaming
  /*
  if (Array.isArray(requestBody.messages)) {
    const hasDeveloper = requestBody.messages.some(m => m.role === "developer");
    const systemIndex = requestBody.messages.findIndex(m => m.role === "system");
    if (!hasDeveloper && systemIndex !== -1) {
      console.log(`[o1] Renaming system role to developer role at index ${systemIndex}`);
      requestBody.messages[systemIndex].role = "developer";
    }
  }
  */
}

/**
 * Processes messages for o1 models by converting all messages into user messages
 * with special formatting for system/developer roles - only for outgoing requests
 */
function processO1Messages(messages) {
  if (!messages || messages.length === 0) return [];
  
  // First collect system/developer messages
  let systemContent = '';
  const regularMessages = [];
  
  for (const msg of messages) {
    if (msg.role === 'system' || msg.role === 'developer') {
      systemContent += `BEGINNING ${msg.role.toUpperCase()} PROMPT\n\n${msg.content}\n\nEND ${msg.role.toUpperCase()} PROMPT\n\n`;
    } else {
      regularMessages.push({
        content: msg.content,
        role: 'user'
      });
    }
  }

  // If we have system content, append it to the last message or create one
  if (systemContent) {
    if (regularMessages.length > 0) {
      const lastMsg = regularMessages[regularMessages.length - 1];
      lastMsg.content = `${lastMsg.content}\n\n${systemContent}`;
    } else {
      regularMessages.push({
        content: systemContent.trim(),
        role: 'user'
      });
    }
  }
  
  return regularMessages;
}

/**
 * Build a chat request body that supports GPT-3.5/4
 * and also o1/o1-mini models with 'max_completion_tokens'.
 */
function buildChatRequestBody(payload, defaultModel = "gpt-4o") {
  // Start with a clean body containing all direct fields from payload
  const body = { ...payload };  // This ensures we keep ALL fields
  
  // Override only what we need to customize
  body.model = payload.model || defaultModel;


  //strip out method form the payuload
  delete body.method;
  
  const isO1Family = (
    body.model.startsWith("o1") ||
    body.model.includes("o1-mini") ||
    body.model.startsWith("o3") ||
    body.model.includes("o3-mini")
  );
  
  const modelConfig = getModelConfig(body.model);

  // Messages handling
  body.messages = isO1Family ? processO1Messages(payload.messages || []) : (payload.messages || []);
  
  // Temperature (only if not explicitly set)
  if (body.temperature === undefined) {
    body.temperature = modelConfig.temperature;
  }

  // FIX: Handle tokens differently for o1/o3 vs gpt-4 models
  const maxTokens = body.max_tokens !== undefined ? 
    Math.min(body.max_tokens, modelConfig.maxTokens) : 
    modelConfig.maxTokens;

  if (isO1Family) {
    body.max_completion_tokens = maxTokens;
    delete body.max_tokens;  // Remove max_tokens for o1/o3
  } else {
    body.max_tokens = maxTokens;
    delete body.max_completion_tokens;  // Remove max_completion_tokens for gpt-4
  }

  // Ensure response_format is preserved exactly as provided
  if (payload.response_format) {
    body.response_format = payload.response_format;
  } else if (payload.json_schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: payload.json_schema.name || "default_schema",
        description: payload.json_schema.description,
        strict: payload.json_schema.strict !== false,
        schema: {
          type: "object",
          properties: payload.json_schema.properties || {},
          required: payload.json_schema.required || Object.keys(payload.json_schema.properties || {}),
          additionalProperties: false
        }
      }
    };
  }

  if (isO1Family) {
    preprocessForO1(body);
  }

  // Debug log
  console.log('🔍 Final Request Body:', JSON.stringify(body, null, 2));

  return body;
}

// -----------------------------------------------------------------------
// 1) Chat (non-streaming)
// -----------------------------------------------------------------------
export async function handleChatCompletion(payload) {
  console.log("🎯 🎯 🎯 CHAT COMPLETION CALLED 🎯 🎯 🎯");
  console.log("📩 INCOMING PAYLOAD:", JSON.stringify(payload, null, 2));
  
  const path = "/chat/completions";
  const requestBody = buildChatRequestBody(payload, "gpt-4o");
  
  console.log("🔄 TRANSFORMED REQUEST:", JSON.stringify(requestBody, null, 2));
  
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
  
  console.log("📤 FINAL RESULT:", JSON.stringify(result, null, 2));
  console.log("🏁 🏁 🏁 CHAT COMPLETION FINISHED 🏁 🏁 🏁");
  
  return result;
}

// -----------------------------------------------------------------------
// 2) Streaming Chat
// -----------------------------------------------------------------------
/**
 * NEW: Handle streaming chat completions via Server-Sent Events (SSE)
 * Updated to use broadcastEvent for sending chunks back via the plugin bridge.
 */
export async function handleChatCompletionStream(payload, sender, requestId, broadcastEvent) {
  // Try to load API key if missing
  if (!_apiKey) {
    console.log("[OpenAI] No API key set for streaming, attempting to load");
    
    try {
      // Use our hierarchical API key loading function
      const keyLoaded = await ensureApiKeyLoaded();
      
      if (!keyLoaded) {
        console.error("[OpenAI] Failed to load API key for streaming");
        throw new Error("No API key set for OpenAI! Please setApiKey(...) first or store in environment variables.");
      }
    } catch (err) {
      console.error("[OpenAI] Error during API key loading attempt for streaming:", err);
      throw new Error("Error loading API key: " + err.message);
    }
  }
  
  // Still no API key after trying to load it
  if (!_apiKey) {
    throw new Error("No API key set for OpenAI! Please setApiKey(...) first or store in environment variables.");
  }

  if (!requestId || typeof broadcastEvent !== 'function') {
    console.error("[openai.js] Missing requestId or broadcastEvent for streaming.");
    throw new Error("Streaming setup failed.");
  }

  const url = `${OPENAI_API_BASE}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${_apiKey}`,
    "Accept": "text/event-stream" // Important for SSE
  };
  if (_organizationId) {
    headers["OpenAI-Organization"] = _organizationId;
  }

  const body = buildChatRequestBody({ ...payload, stream: true }); // Ensure stream is true

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      
      // Special case for authentication errors - might need to reload API key
      if (res.status === 401) {
        console.error("[OpenAI] Authentication error (401) during streaming - API key may be invalid or expired");
        // Clear the key so next request will try to reload it from superenv
        _apiKey = null;
        console.log("[OpenAI] API key cleared - will try to reload from superenv on next request");
      }
      
      const error = new Error(`OpenAI API Error (${res.status}) during stream setup: ${errorBody.error?.message || "Unknown error"}`);
      error.status = res.status;
      error.endpoint = url;
      error.method = "POST";
      error.requestBody = body;
      error.responseBody = errorBody;
      throw error;
    }

    // Process the stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (events) in the buffer
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const eventStr = buffer.substring(0, boundary);
        buffer = buffer.substring(boundary + 2); // Skip the \n\n

        if (eventStr.startsWith("data: ")) {
          const dataStr = eventStr.substring(6).trim(); // Get the JSON part
          if (dataStr === "[DONE]") {
            // End of stream signaled by OpenAI
            // The final result is often synthesized or handled differently,
            // but we could broadcast a 'DONE' event if needed.
            // broadcastEvent('STREAM_DONE', [requestId]);
          } else {
            try {
              const chunk = JSON.parse(dataStr);
              // Broadcast the chunk back via the content script -> page
              broadcastEvent('STREAM_CHUNK', [requestId, chunk]); // Pass requestId and chunk
            } catch (e) {
              console.error("[openai.js] Error parsing stream chunk:", e, "Data:", dataStr);
            }
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    // Handle any remaining buffer if necessary (usually shouldn't happen with SSE)

    // Since the stream has ended, we don't have a single consolidated 'result'
    // like in non-streaming calls. The caller (page script) needs to reconstruct
    // the full response from the chunks. We resolve the promise to indicate completion.
    return { success: true, message: "Stream completed" }; // Indicate successful stream processing

  } catch (err) {
    console.error("[openai.js] Error during chat stream:", err);
    // Broadcast an error event? Or let the main catch handle it.
    // broadcastEvent('STREAM_ERROR', [requestId, err.message]);
    throw err; // Re-throw so the bridge's catch handler sends an error response
  }
}

// -----------------------------------------------------------------------
// 3) Image generation
// -----------------------------------------------------------------------
export async function handleImageGeneration(payload) {
  const path = "/images/generations";
  const body = {
    model: payload.model || "dall-e-3",
    prompt: payload.prompt || "A cute cat",
    n: payload.n ?? 1,
    size: payload.size || "1024x1024",
  };
  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// -----------------------------------------------------------------------
// 4) Structured completion
// -----------------------------------------------------------------------
export async function handleStructuredCompletion(payload) {
  const path = "/chat/completions";
  const requestBody = buildChatRequestBody(payload, "gpt-4o");
  
  // Handle response format with proper json_schema structure
  if (payload.responseFormat) {
    requestBody.response_format = payload.responseFormat;
  } else if (payload.json_schema) {
    // Support direct json_schema input for convenience
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: payload.json_schema.name || "default_schema",
        description: payload.json_schema.description,
        strict: payload.json_schema.strict !== false, // default to true
        schema: {
          type: "object",
          properties: payload.json_schema.properties || {},
          required: payload.json_schema.required || Object.keys(payload.json_schema.properties || {}),
          additionalProperties: false
        }
      }
    };
  } else {
    // Default to simple json_object if no schema provided
    requestBody.response_format = { type: "json_object" };
  }

  // Force temperature=1 for more consistent creative output
  if (payload.temperature === undefined) {
    requestBody.temperature = 1;
  }

  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

// -----------------------------------------------------------------------
// 5) Function Calls
// -----------------------------------------------------------------------
export async function handleFunctionCall(payload) {
  const path = "/chat/completions";
  const requestBody = buildChatRequestBody(payload, "gpt-4o");
  if (payload.tools) requestBody.tools = payload.tools;
  if (payload.toolChoice) requestBody.tool_choice = payload.toolChoice;
  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

// -----------------------------------------------------------------------
// 6) Audio (speech, transcription, translation)
// -----------------------------------------------------------------------
export async function handleAudioSpeech(payload) {
  const path = "/audio/speech";
  const body = {
    model: payload.model || "tts-1",
    input: payload.input || "Hello world",
    voice: payload.voice || "alloy",
    response_format: payload.response_format || "mp3",
    speed: payload.speed ?? 1.0
  };

  const url = `${OPENAI_API_BASE}${path}`;
  const headers = {
    "Authorization": `Bearer ${_apiKey}`,
    "Content-Type": "application/json",
    ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio speech failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.text();
}

export async function handleAudioTranscription(payload) {
  const path = "/audio/transcriptions";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("model", payload.model || "whisper-1");
  if (payload.language) formData.append("language", payload.language);
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.response_format) formData.append("response_format", payload.response_format);
  if (payload.temperature !== undefined) formData.append("temperature", payload.temperature);

  const headers = {
    "Authorization": `Bearer ${_apiKey}`,
    ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
  };
  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio transcription failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

export async function handleAudioTranslation(payload) {
  const path = "/audio/translations";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("model", payload.model || "whisper-1");
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.response_format) formData.append("response_format", payload.response_format);
  if (payload.temperature !== undefined) formData.append("temperature", payload.temperature);

  const headers = {
    "Authorization": `Bearer ${_apiKey}`,
    ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
  };
  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio translation failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

// -----------------------------------------------------------------------
// 7) Embeddings
// -----------------------------------------------------------------------
export async function handleEmbeddings(payload) {
  const path = "/embeddings";
  const body = {
    model: payload.model || "text-embedding-ada-002",
    input: payload.input,
    encoding_format: payload.encoding_format || "float"
  };
  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// -----------------------------------------------------------------------
// 8) Fine-tuning
// -----------------------------------------------------------------------
export async function handleFineTuneCreate(payload) {
  const path = "/fine_tuning/jobs";
  const body = {
    model: payload.model || "gpt-4o-mini",
    training_file: payload.training_file,
    validation_file: payload.validation_file || null,
    suffix: payload.suffix || null,
    method: payload.method || {},
    integrations: payload.integrations || null,
    seed: payload.seed
  };
  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function handleFineTuneList(payload) {
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs${queryString}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleFineTuneRetrieve(payload) {
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleFineTuneCancel(payload) {
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}/cancel`;
  return await openaiFetch(path, { method: "POST" });
}

export async function handleFineTuneListEvents(payload) {
  const jobId = payload.fine_tuning_job_id;
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs/${jobId}/events${queryString}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleFineTuneListCheckpoints(payload) {
  const jobId = payload.fine_tuning_job_id;
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs/${jobId}/checkpoints${queryString}`;
  return await openaiFetch(path, { method: "GET" });
}

// -----------------------------------------------------------------------
// 9) Files
// -----------------------------------------------------------------------
export async function handleFileUpload(payload) {
  const path = "/files";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("purpose", payload.purpose || "fine-tune");

  const url = `${OPENAI_API_BASE}${path}`;
  const headers = {
    "Authorization": `Bearer ${_apiKey}`,
    ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] fileUpload failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

export async function handleFileList(payload) {
  const qs = [];
  if (payload.purpose) qs.push(`purpose=${encodeURIComponent(payload.purpose)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  if (payload.order) qs.push(`order=${encodeURIComponent(payload.order)}`);
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/files${queryString}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleFileRetrieve(payload) {
  const fileId = payload.file_id;
  const path = `/files/${fileId}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleFileDelete(payload) {
  const fileId = payload.file_id;
  const path = `/files/${fileId}`;
  return await openaiFetch(path, { method: "DELETE" });
}

export async function handleFileContent(payload) {
  const fileId = payload.file_id;
  const path = `/files/${fileId}/content`;
  const url = `${OPENAI_API_BASE}${path}`;
  const headers = {
    "Authorization": `Bearer ${_apiKey}`,
    ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
  };
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] fileContent failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.text();
}

// -----------------------------------------------------------------------
// 10) Models
// -----------------------------------------------------------------------
export async function handleModelList(payload) {
  const path = "/models";
  return await openaiFetch(path, { method: "GET" });
}

export async function handleModelRetrieve(payload) {
  const modelId = payload.model;
  const path = `/models/${modelId}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleModelDelete(payload) {
  const modelId = payload.model;
  const path = `/models/${modelId}`;
  return await openaiFetch(path, { method: "DELETE" });
}

// -----------------------------------------------------------------------
// 11) Batches
// -----------------------------------------------------------------------
export async function handleBatchCreate(payload) {
  const path = "/batches";
  const body = {
    input_file_id: payload.input_file_id,
    endpoint: payload.endpoint,
    completion_window: payload.completion_window,
    metadata: payload.metadata || null
  };
  return await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function handleBatchRetrieve(payload) {
  const batchId = payload.batch_id;
  const path = `/batches/${batchId}`;
  return await openaiFetch(path, { method: "GET" });
}

export async function handleBatchCancel(payload) {
  const batchId = payload.batch_id;
  const path = `/batches/${batchId}/cancel`;
  return await openaiFetch(path, { method: "POST" });
}

export async function handleBatchList(payload) {
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/batches${queryString}`;
  return await openaiFetch(path, { method: "GET" });
}
