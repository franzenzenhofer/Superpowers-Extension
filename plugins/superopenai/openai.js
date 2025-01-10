/**
 * openai.js
 * 
 * Provides utility functions for calling OpenAI endpoints. 
 * Handles differences between GPT-3.5/GPT-4 style models 
 * and the new 'o1' / 'o1-mini' models, particularly around 
 * `max_tokens` vs `max_completion_tokens` and ignoring some 
 * advanced parameters.
 */

// -----------------------------------------------------
// 1) Module-level state & exports
// -----------------------------------------------------
const OPENAI_API_BASE = "https://api.openai.com/v1";
let _apiKey = null;
let _organizationId = null;

/**
 * Sets the in-memory API key to use for all subsequent OpenAI calls.
 * @param {string} key The OpenAI API key
 */
export function setApiKey(key) {
  _apiKey = key;
}

/**
 * Sets the optional organization ID, which is sent as the "OpenAI-Organization" header.
 * @param {string} orgId 
 */
export function setOrganizationId(orgId) {
  _organizationId = orgId;
}

// -----------------------------------------------------
// 2) Internal: Low-level fetch wrapper
// -----------------------------------------------------
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

// -----------------------------------------------------
// 3) Internal: O1 parameter enforcement
//     Single place to handle unique o1 constraints
// -----------------------------------------------------
/**
 * If the model is in the o1 family, we do some or all of:
 * - Re-map max_tokens => max_completion_tokens if needed
 * - Log if we ignore certain GPT-only or advanced parameters
 * - Force temperature=1
 * - Convert any "system" message to "developer" if there's no existing developer role
 * - Remove presence_penalty, freq_penalty, logit_bias, logprobs, top_logprobs, n, stream
 *
 * @param {object} requestBody  The request body we plan to send to /chat/completions
 */
function enforceO1Constraints(requestBody) {
  // 1) Remove GPT-specific or advanced parameters that O1 doesn't support
  const removeParams = [
    "presence_penalty", "frequency_penalty", "logit_bias",
    "logprobs", "top_logprobs", "n", "stream"
  ];
  for (const p of removeParams) {
    if (typeof requestBody[p] !== "undefined") {
      console.log(`[o1] Removing unused param '${p}'`);
      delete requestBody[p];
    }
  }

  // 2) Force temperature to 1, with a log if user used something else
  if (requestBody.temperature !== 1) {
    if (typeof requestBody.temperature !== "undefined") {
      console.log(`[o1] Overriding user temperature=${requestBody.temperature} to 1`);
    }
    requestBody.temperature = 1;
  }

  // 3) If there's a "system" message but no "developer" message, rename it
  if (Array.isArray(requestBody.messages)) {
    const hasDev = requestBody.messages.some(m => m.role === "developer");
    const systemIndex = requestBody.messages.findIndex(m => m.role === "system");
    if (!hasDev && systemIndex >= 0) {
      console.log(`[o1] Changing 'system' role to 'developer' at index ${systemIndex}`);
      requestBody.messages[systemIndex].role = "developer";
    }
  }
}

// -----------------------------------------------------
// 4) Internal: "chat completions" request builder 
//     that unifies GPT vs. O1 families
// -----------------------------------------------------
/**
 * Builds the JSON body for a /chat/completions request, 
 * handling differences between GPT models (which want max_tokens)
 * and O1 models (which want max_completion_tokens).
 *
 * - If the user is using O1 but only gave max_tokens, we adopt 
 *   that as max_completion_tokens.
 * - If the user gave both, we favor max_completion_tokens and log we ignore max_tokens.
 * - If GPT, we just do normal "max_tokens".
 *
 * @param {object} payload  The user's request payload
 * @param {string} [defaultModel="gpt-4"]  If payload.model is absent
 * @returns {object} the final request body
 */
function buildChatRequestBody(payload, defaultModel = "gpt-4") {
  // 1) Determine model
  const modelToUse = payload.model || defaultModel;
  const body = {
    model: modelToUse,
    messages: payload.messages || []
  };

  // 2) Check if O1 family
  const isO1 = modelToUse.startsWith("o1") || modelToUse.includes("o1-mini");
  if (!isO1) {
    // GPT path: use max_tokens
    body.max_tokens = (typeof payload.max_tokens === "number") ? payload.max_tokens : 256;

    // Copy over relevant GPT fields
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
    return body;
  }

  // O1 path: use max_completion_tokens 
  const hasMaxComp = (typeof payload.max_completion_tokens === "number");
  const hasMaxTok = (typeof payload.max_tokens === "number");

  if (hasMaxComp && hasMaxTok) {
    console.log(`[o1] Both 'max_tokens' and 'max_completion_tokens' provided. Ignoring max_tokens=${payload.max_tokens}.`);
    body.max_completion_tokens = payload.max_completion_tokens;
  } else if (hasMaxComp) {
    body.max_completion_tokens = payload.max_completion_tokens;
  } else if (hasMaxTok) {
    console.log(`[o1] Using max_tokens=${payload.max_tokens} as 'max_completion_tokens'.`);
    body.max_completion_tokens = payload.max_tokens;
  } else {
    body.max_completion_tokens = 256; // fallback
  }

  // Copy other user-specified fields 
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

  // 3) Enforce special O1 constraints (in one place)
  enforceO1Constraints(body);

  return body;
}

// -----------------------------------------------------
// 5) Public handlers: these directly call openaiFetch
//     with the correct path and body
// -----------------------------------------------------

// 5a) Chat completion
export async function handleChatCompletion(payload) {
  const path = "/chat/completions";
  const body = buildChatRequestBody(payload, /* defaultModel: */ "gpt-4");
  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// 5b) Image generation
export async function handleImageGeneration(payload) {
  const path = "/images/generations";
  const requestBody = {
    model: payload.model || "dall-e-3",
    prompt: payload.prompt || "A cute cat",
    n: payload.n ?? 1,
    size: payload.size || "1024x1024",
  };
  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

// 5c) Structured completion
export async function handleStructuredCompletion(payload) {
  const path = "/chat/completions";
  // Typically we want "gpt-4o" by default, but user can override 
  const body = buildChatRequestBody(payload, "gpt-4o");

  // For structured responses, we might set some default
  if (!payload.responseFormat) {
    body.response_format = { type: "json_object" };
  } else {
    body.response_format = payload.responseFormat;
  }

  // Some prefer temperature=0 for structured, unless user sets it
  if (payload.temperature === undefined) {
    body.temperature = 0;
  }

  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// 5d) Function call
export async function handleFunctionCall(payload) {
  const path = "/chat/completions";
  const body = buildChatRequestBody(payload, "gpt-4o");
  if (payload.tools) body.tools = payload.tools;
  if (payload.toolChoice) body.tool_choice = payload.toolChoice;

  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// 5e) Audio
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
  const res = await fetch(url, {
    method: "POST",
    headers: buildBaseHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw await buildAudioError("Audio speech", res);
  return res.text();
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

  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildBaseHeaders(false), // formData => no "Content-Type": "application/json"
    body: formData
  });
  if (!res.ok) throw await buildAudioError("Audio transcription", res);
  return res.json();
}

export async function handleAudioTranslation(payload) {
  const path = "/audio/translations";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("model", payload.model || "whisper-1");
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.response_format) formData.append("response_format", payload.response_format);
  if (payload.temperature !== undefined) formData.append("temperature", payload.temperature);

  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildBaseHeaders(false),
    body: formData
  });
  if (!res.ok) throw await buildAudioError("Audio translation", res);
  return res.json();
}

// 5f) Embeddings
export async function handleEmbeddings(payload) {
  const path = "/embeddings";
  const body = {
    model: payload.model || "text-embedding-ada-002",
    input: payload.input,
    encoding_format: payload.encoding_format || "float"
  };
  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// 5g) Fine-tuning
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
  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}
export async function handleFineTuneList(payload) {
  const qs = buildQueryString({
    after: payload.after,
    limit: payload.limit
  });
  const path = `/fine_tuning/jobs${qs}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleFineTuneRetrieve(payload) {
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleFineTuneCancel(payload) {
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}/cancel`;
  return openaiFetch(path, { method: "POST" });
}
export async function handleFineTuneListEvents(payload) {
  const jobId = payload.fine_tuning_job_id;
  const qs = buildQueryString({
    after: payload.after,
    limit: payload.limit
  });
  const path = `/fine_tuning/jobs/${jobId}/events${qs}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleFineTuneListCheckpoints(payload) {
  const jobId = payload.fine_tuning_job_id;
  const qs = buildQueryString({
    after: payload.after,
    limit: payload.limit
  });
  const path = `/fine_tuning/jobs/${jobId}/checkpoints${qs}`;
  return openaiFetch(path, { method: "GET" });
}

// 5h) Files
export async function handleFileUpload(payload) {
  const path = "/files";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("purpose", payload.purpose || "fine-tune");

  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildBaseHeaders(false),
    body: formData
  });

  if (!res.ok) throw await buildAudioError("fileUpload", res);
  return res.json();
}
export async function handleFileList(payload) {
  const qs = buildQueryString({
    purpose: payload.purpose,
    limit: payload.limit,
    order: payload.order,
    after: payload.after
  });
  const path = `/files${qs}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleFileRetrieve(payload) {
  const path = `/files/${payload.file_id}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleFileDelete(payload) {
  const path = `/files/${payload.file_id}`;
  return openaiFetch(path, { method: "DELETE" });
}
export async function handleFileContent(payload) {
  const path = `/files/${payload.file_id}/content`;
  const url = `${OPENAI_API_BASE}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: buildBaseHeaders(false)
  });
  if (!res.ok) throw await buildAudioError("fileContent", res);
  return res.text();
}

// 5i) Models
export async function handleModelList(payload) {
  return openaiFetch("/models", { method: "GET" });
}
export async function handleModelRetrieve(payload) {
  const path = `/models/${payload.model}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleModelDelete(payload) {
  const path = `/models/${payload.model}`;
  return openaiFetch(path, { method: "DELETE" });
}

// 5j) Batches
export async function handleBatchCreate(payload) {
  const path = "/batches";
  const body = {
    input_file_id: payload.input_file_id,
    endpoint: payload.endpoint,
    completion_window: payload.completion_window,
    metadata: payload.metadata || null
  };
  return openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}
export async function handleBatchRetrieve(payload) {
  const path = `/batches/${payload.batch_id}`;
  return openaiFetch(path, { method: "GET" });
}
export async function handleBatchCancel(payload) {
  const path = `/batches/${payload.batch_id}/cancel`;
  return openaiFetch(path, { method: "POST" });
}
export async function handleBatchList(payload) {
  const qs = buildQueryString({
    after: payload.after,
    limit: payload.limit
  });
  const path = `/batches${qs}`;
  return openaiFetch(path, { method: "GET" });
}

// -----------------------------------------------------
// 6) Minor helper functions
// -----------------------------------------------------
function buildBaseHeaders(isJson = true) {
  const hdrs = {
    "Authorization": `Bearer ${_apiKey}`,
  };
  if (_organizationId) {
    hdrs["OpenAI-Organization"] = _organizationId;
  }
  if (isJson) {
    hdrs["Content-Type"] = "application/json";
  }
  return hdrs;
}

async function buildAudioError(label, res) {
  const errorBody = await res.json().catch(() => ({}));
  return new Error(`[OpenAI Error] ${label} failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
}

function buildQueryString(params) {
  const entries = Object.entries(params)
    .filter(([_, val]) => val !== undefined && val !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return entries.length ? `?${entries.join("&")}` : "";
}
