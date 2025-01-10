/**
 * openai.js
 * ---------------------------------------------
 * Contains all logic for interacting with the OpenAI API
 * (including the new SSE streaming logic for "chatCompletionStream".)
 */

const OPENAI_API_BASE = "https://api.openai.com/v1";

// In-memory config
let _apiKey = null;
let _organizationId = null;

/**
 * Store the user’s API key
 */
export function setApiKey(key) {
  _apiKey = key;
}

/**
 * Store the user’s organization ID
 */
export function setOrganizationId(orgId) {
  _organizationId = orgId;
}

/**
 * A helper for normal (non-stream) fetch calls
 */
async function openaiFetch(path, options = {}) {
  if (!_apiKey) {
    throw new Error("No API key set for OpenAI! Please setApiKey(...) first or store in extension config.");
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
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
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
 * If we’re using an o1 or o1-mini model, forcibly remove/override certain params
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

  // Check messages array for system->developer rename if no existing developer
  if (Array.isArray(requestBody.messages)) {
    const hasDeveloper = requestBody.messages.some(m => m.role === "developer");
    const systemIndex = requestBody.messages.findIndex(m => m.role === "system");
    if (!hasDeveloper && systemIndex !== -1) {
      console.log(`[o1] Renaming system role to developer role at index ${systemIndex}`);
      requestBody.messages[systemIndex].role = "developer";
    }
  }
}

/**
 * Build a chat request body that supports GPT-3.5/4
 * and also o1/o1-mini models with 'max_completion_tokens'.
 */
function buildChatRequestBody(payload, defaultModel = "gpt-4") {
  const modelToUse = payload.model || defaultModel;
  const isO1Family = modelToUse.startsWith("o1") || modelToUse.includes("o1-mini");

  const body = {
    model: modelToUse,
    messages: payload.messages || []
  };

  // Handle max_tokens
  const userMaxTokens = payload.max_tokens !== undefined ? payload.max_tokens : 256;
  const userMaxCompTokens = payload.max_completion_tokens !== undefined
    ? payload.max_completion_tokens
    : userMaxTokens; // fallback

  if (isO1Family) {
    body.max_completion_tokens = userMaxCompTokens;

    // Copy user-provided fields that we'll later preprocess
    if (payload.temperature !== undefined) body.temperature = payload.temperature;
    if (payload.top_p !== undefined) body.top_p = payload.top_p;
    if (payload.presence_penalty !== undefined) body.presence_penalty = payload.presence_penalty;
    if (payload.frequency_penalty !== undefined) body.frequency_penalty = payload.frequency_penalty;
    if (payload.logit_bias !== undefined) body.logit_bias = payload.logit_bias;
    if (payload.logprobs !== undefined) body.logprobs = payload.logprobs;
    if (payload.top_logprobs !== undefined) body.top_logprobs = payload.top_logprobs;
    if (payload.n !== undefined) body.n = payload.n;
    if (payload.stream !== undefined) body.stream = payload.stream;
    if (payload.stop) body.stop = payload.stop;

    // Then do the forced O1 preprocessing
    preprocessForO1(body);
  } else {
    // GPT-3.5, GPT-4 style
    body.max_tokens = userMaxTokens;
    if (payload.temperature !== undefined) body.temperature = payload.temperature;
    if (payload.top_p !== undefined) body.top_p = payload.top_p;
    if (payload.presence_penalty !== undefined) body.presence_penalty = payload.presence_penalty;
    if (payload.frequency_penalty !== undefined) body.frequency_penalty = payload.frequency_penalty;
    if (payload.stop) body.stop = payload.stop;
    if (payload.logit_bias !== undefined) body.logit_bias = payload.logit_bias;
    if (payload.logprobs !== undefined) body.logprobs = payload.logprobs;
    if (payload.top_logprobs !== undefined) body.top_logprobs = payload.top_logprobs;
    if (payload.n !== undefined) body.n = payload.n;
    if (payload.stream !== undefined) body.stream = payload.stream;
  }

  return body;
}

// -----------------------------------------------------------------------
// 1) Chat (non-streaming)
// -----------------------------------------------------------------------
export async function handleChatCompletion(payload) {
  const path = "/chat/completions";
  const requestBody = buildChatRequestBody(payload, "gpt-4");
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
  return result;
}

// -----------------------------------------------------------------------
// 2) Streaming Chat
// -----------------------------------------------------------------------
/**
 * Streaming version of chat completion, using SSE (Server-Sent Events)
 *
 * @param {object} payload       - The request payload (model, messages, etc.)
 * @param {function} onPartialChunk - Callback for each SSE chunk from OpenAI
 * @returns {Promise<object>} final result when the stream ends
 */
export async function handleChatCompletionStream(payload, onPartialChunk) {
  const path = "/chat/completions";
  const requestBody = buildChatRequestBody(payload, "gpt-4");
  // Force streaming
  requestBody.stream = true;

  // Prepare fetch
  if (!_apiKey) {
    throw new Error("No API key set for OpenAI!");
  }
  const url = `${OPENAI_API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${_apiKey}`
  };
  if (_organizationId) {
    headers["OpenAI-Organization"] = _organizationId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`OpenAI SSE Error (${res.status}): ${errorBody.error?.message || "Unknown error"}`);
  }

  // Parse the SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex;
    while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
      const sseEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const lines = sseEvent.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice("data:".length).trim();
          if (jsonStr === "[DONE]") {
            // end of stream
            return { message: "Stream completed" };
          }
          try {
            const parsed = JSON.parse(jsonStr);
            if (onPartialChunk) {
              onPartialChunk(parsed);
            }
          } catch (err) {
            console.warn("[handleChatCompletionStream] SSE parse error:", err, jsonStr);
          }
        }
      }
    }
  }

  // If we get here, no [DONE] marker was found
  return { message: "Stream ended (no [DONE])" };
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
  if (payload.responseFormat) {
    requestBody.response_format = payload.responseFormat;
  } else {
    requestBody.response_format = { type: "json_object" };
  }
  if (payload.temperature === undefined) {
    requestBody.temperature = 0;
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
