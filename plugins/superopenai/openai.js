const OPENAI_API_BASE = "https://api.openai.com/v1";

// In-memory config
let _apiKey = null;
let _organizationId = null;

export function setApiKey(key) {
  _apiKey = key;
}

export function setOrganizationId(orgId) {
  _organizationId = orgId;
}

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
      error.method = options.method || 'GET';
      error.requestBody = options.body ? JSON.parse(options.body) : undefined;
      error.responseBody = errorBody;
      throw error;
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout for ${path}`);
    }
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      throw new Error(`Network error while calling ${path}. Check your internet connection.`);
    }
    throw err;
  }
}

// ==================================================
// Existing Handlers
// ==================================================

// 1) Chat
export async function handleChatCompletion(payload) {
  const path = "/chat/completions";
  const body = {
    model: payload.model || "gpt-4o-mini",
    messages: payload.messages || [],
    temperature: payload.temperature ?? 0.7,
    max_completion_tokens: payload.max_completion_tokens ?? 256,
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// 2) Images
export async function handleImageGeneration(payload) {
  const path = "/images/generations";
  const body = {
    model: payload.model || "dall-e-3",
    prompt: payload.prompt || "A cute cat",
    n: payload.n ?? 1,
    size: payload.size || "1024x1024",
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// 3) Structured completion (JSON)
export async function handleStructuredCompletion(payload) {
  const path = "/chat/completions";
  const body = {
    model: payload.model || "gpt-4o",
    messages: payload.messages || [],
    response_format: payload.responseFormat || { type: "json_object" },
    temperature: payload.temperature ?? 0,
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// 4) Function Calls
export async function handleFunctionCall(payload) {
  const path = "/chat/completions";
  const body = {
    model: payload.model || "gpt-4o",
    messages: payload.messages || [],
    tools: payload.tools || [],
    tool_choice: payload.toolChoice || "auto",
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// ==================================================
// NEW: Audio
// ==================================================

// A) Audio: speech (TTS)
export async function handleAudioSpeech(payload) {
  // Endpoint: POST /v1/audio/speech
  // Typically returns audio bytes. For minimal changes, we treat as text or base64.
  const path = "/audio/speech";
  const body = {
    model: payload.model || "tts-1",
    input: payload.input || "Hello world",
    voice: payload.voice || "alloy",
    response_format: payload.response_format || "mp3",
    speed: payload.speed ?? 1.0
  };

  const res = await fetch(`${OPENAI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${_apiKey}`,
      "Content-Type": "application/json",
      ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio speech failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }

  // If you need raw audio, do: return await res.blob();
  // For minimal approach, returning text (base64 or mp3) as raw string:
  return await res.text();
}

// B) Audio: transcription
export async function handleAudioTranscription(payload) {
  // Endpoint: POST /v1/audio/transcriptions
  // Uses multipart/form-data
  const path = "/audio/transcriptions";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("model", payload.model || "whisper-1");
  if (payload.language) formData.append("language", payload.language);
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.response_format) formData.append("response_format", payload.response_format);
  if (payload.temperature !== undefined) formData.append("temperature", payload.temperature);

  const res = await fetch(`${OPENAI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${_apiKey}`,
      ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
    },
    body: formData
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio transcription failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

// C) Audio: translation
export async function handleAudioTranslation(payload) {
  // Endpoint: POST /v1/audio/translations
  const path = "/audio/translations";
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("model", payload.model || "whisper-1");
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.response_format) formData.append("response_format", payload.response_format);
  if (payload.temperature !== undefined) formData.append("temperature", payload.temperature);

  const res = await fetch(`${OPENAI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${_apiKey}`,
      ...( _organizationId ? { "OpenAI-Organization": _organizationId } : {} )
    },
    body: formData
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] Audio translation failed. status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

// ==================================================
// NEW: Embeddings
// ==================================================
export async function handleEmbeddings(payload) {
  // Endpoint: POST /v1/embeddings
  const path = "/embeddings";
  const body = {
    model: payload.model || "text-embedding-ada-002",
    input: payload.input,
    encoding_format: payload.encoding_format || "float"
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// ==================================================
// NEW: Fine-tuning
// ==================================================

// 1) Create fine-tuning job
export async function handleFineTuneCreate(payload) {
  // POST /v1/fine_tuning/jobs
  const path = "/fine_tuning/jobs";
  // We'll assume we pass the same fields as in the official spec
  const body = {
    model: payload.model || "gpt-4o-mini",
    training_file: payload.training_file,
    validation_file: payload.validation_file || null,
    suffix: payload.suffix || null,
    method: payload.method || {},        // e.g. { type: "supervised", supervised: { hyperparameters: {...} } }
    integrations: payload.integrations || null,
    seed: payload.seed,
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// 2) List fine-tuning jobs
export async function handleFineTuneList(payload) {
  // GET /v1/fine_tuning/jobs
  // optional query: after, limit
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs${queryString}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// 3) Retrieve fine-tuning job
export async function handleFineTuneRetrieve(payload) {
  // GET /v1/fine_tuning/jobs/{fine_tuning_job_id}
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// 4) Cancel fine-tuning job
export async function handleFineTuneCancel(payload) {
  // POST /v1/fine_tuning/jobs/{fine_tuning_job_id}/cancel
  const jobId = payload.fine_tuning_job_id;
  const path = `/fine_tuning/jobs/${jobId}/cancel`;
  const result = await openaiFetch(path, { method: "POST" });
  return result;
}

// 5) List fine-tuning events
export async function handleFineTuneListEvents(payload) {
  // GET /v1/fine_tuning/jobs/{fine_tuning_job_id}/events
  const jobId = payload.fine_tuning_job_id;
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs/${jobId}/events${queryString}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// 6) List fine-tuning checkpoints
export async function handleFineTuneListCheckpoints(payload) {
  // GET /v1/fine_tuning/jobs/{fine_tuning_job_id}/checkpoints
  const jobId = payload.fine_tuning_job_id;
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/fine_tuning/jobs/${jobId}/checkpoints${queryString}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// ==================================================
// NEW: Files
// ==================================================

// A) Upload file
export async function handleFileUpload(payload) {
  // POST /v1/files
  // multipart/form-data with { file, purpose }
  const path = "/files";
  const formData = new FormData();
  formData.append("file", payload.file);     // a File or Blob
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

// B) List files
export async function handleFileList(payload) {
  // GET /v1/files
  // optional query: purpose, limit, order, after
  const qs = [];
  if (payload.purpose) qs.push(`purpose=${encodeURIComponent(payload.purpose)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  if (payload.order) qs.push(`order=${encodeURIComponent(payload.order)}`);
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/files${queryString}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// C) Retrieve file
export async function handleFileRetrieve(payload) {
  // GET /v1/files/{file_id}
  const fileId = payload.file_id;
  const path = `/files/${fileId}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// D) Delete file
export async function handleFileDelete(payload) {
  // DELETE /v1/files/{file_id}
  const fileId = payload.file_id;
  const path = `/files/${fileId}`;
  const result = await openaiFetch(path, { method: "DELETE" });
  return result;
}

// E) Retrieve file content
export async function handleFileContent(payload) {
  // GET /v1/files/{file_id}/content
  const fileId = payload.file_id;
  const path = `/files/${fileId}/content`;

  // The content might not be JSON. We’ll do a raw text approach:
  // If it’s JSONL, you can parse it. We'll do text for minimal changes.
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
  return await res.text(); // or res.blob() if large/binary
}

// ==================================================
// NEW: Models
// ==================================================
export async function handleModelList(payload) {
  // GET /v1/models
  const path = "/models";
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}
export async function handleModelRetrieve(payload) {
  // GET /v1/models/{model}
  const modelId = payload.model;
  const path = `/models/${modelId}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}
export async function handleModelDelete(payload) {
  // DELETE /v1/models/{model}
  const modelId = payload.model;
  const path = `/models/${modelId}`;
  const result = await openaiFetch(path, { method: "DELETE" });
  return result;
}

// ==================================================
// NEW: Batches
// ==================================================

// A) Create batch
export async function handleBatchCreate(payload) {
  // POST /v1/batches
  const path = "/batches";
  const body = {
    input_file_id: payload.input_file_id,
    endpoint: payload.endpoint,
    completion_window: payload.completion_window,
    metadata: payload.metadata || null
  };
  const result = await openaiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return result;
}

// B) Retrieve batch
export async function handleBatchRetrieve(payload) {
  // GET /v1/batches/{batch_id}
  const batchId = payload.batch_id;
  const path = `/batches/${batchId}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}

// C) Cancel batch
export async function handleBatchCancel(payload) {
  // POST /v1/batches/{batch_id}/cancel
  const batchId = payload.batch_id;
  const path = `/batches/${batchId}/cancel`;
  const result = await openaiFetch(path, { method: "POST" });
  return result;
}

// D) List batch
export async function handleBatchList(payload) {
  // GET /v1/batches
  // optional after, limit
  const qs = [];
  if (payload.after) qs.push(`after=${encodeURIComponent(payload.after)}`);
  if (payload.limit) qs.push(`limit=${encodeURIComponent(payload.limit)}`);
  const queryString = qs.length ? `?${qs.join("&")}` : "";
  const path = `/batches${queryString}`;
  const result = await openaiFetch(path, { method: "GET" });
  return result;
}
