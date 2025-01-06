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

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
  
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`[OpenAI Error] status=${res.status}, message=${errorBody.error?.message || "Unknown error"}`);
  }
  return await res.json();
}

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

// 3) Structured
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
