// ga.js
// -------------------------------------------------------------------------
// Provides internal logic for the Google Analytics Admin (v1beta) and Data (v1beta) APIs.
// We no longer attempt /v1/accounts or /v1/properties, etc. Instead, we use /v1beta properly,
// matching the official discovery docs. Also, listing properties requires a filter parameter.
//
// - Admin endpoints => https://analyticsadmin.googleapis.com/v1beta/...
// - Data endpoints  => https://analyticsdata.googleapis.com/v1beta/...
// -------------------------------------------------------------------------

import {
  ensureCredentialsLoaded,
  maybeRefreshToken,
  getToken,
  setToken,
  setClientSecret
} from "./auth.js";

/**
 * GA Data API base URL (v1beta).
 */
const GA_DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

/**
 * GA Admin API base URL (v1beta).
 */
const GA_ADMIN_API_BASE = "https://analyticsadmin.googleapis.com/v1beta";

// Tracks if we've confirmed valid credentials
let _lastLoginStatus = false;

/**
 * Helper for GA Data API calls (v1beta).
 * Retries once if 401/403.
 */
async function gaFetch(path, options = {}) {
  // Possibly refresh token first
  await maybeRefreshToken();

  const token = getToken()?.access_token || getToken()?.token;
  if (!token) {
    throw new Error("[ga] Missing or invalid token. Not logged in?");
  }

  // Build final URL from base
  const isAbsolute = path.startsWith("http");
  const finalUrl = isAbsolute ? path : GA_DATA_API_BASE + path;

  const method = options.method || "POST"; // typical for data requests
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let body = options.body;
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  // Initial request
  let resp;
  try {
    resp = await fetch(finalUrl, { method, headers, body });
  } catch (err) {
    throw new Error("[ga] Could not reach GA Data endpoint (network error).");
  }

  // Possibly refresh on 401/403
  if (resp.status === 401 || resp.status === 403) {
    await maybeRefreshToken();
    const fresh = getToken()?.access_token || getToken()?.token;
    if (!fresh) {
      throw new Error("[ga] No valid token even after refresh attempt.");
    }
    const retryHeaders = { ...headers, Authorization: `Bearer ${fresh}` };
    try {
      resp = await fetch(finalUrl, { method, headers: retryHeaders, body });
    } catch (err2) {
      throw new Error("[ga] Data fetch failed again after refresh.");
    }
    if (!resp.ok) {
      const txt2 = await resp.text().catch(() => "");
      throw new Error(`[ga] GA Data API Error (2nd try) ${resp.status}: ${txt2}`);
    }
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`[ga] GA Data API Error ${resp.status}: ${txt}`);
  }

  try {
    return await resp.json();
  } catch (parseErr) {
    throw new Error("[ga] Could not parse GA Data API JSON.");
  }
}

/**
 * Helper for GA Admin API calls (v1beta).
 * Retries once if 401/403.
 */
async function gaAdminFetch(path, options = {}) {
  await maybeRefreshToken();

  const token = getToken()?.access_token || getToken()?.token;
  if (!token) {
    throw new Error("[gaAdmin] Missing or invalid token. Not logged in?");
  }

  const isAbsolute = path.startsWith("http");
  const finalUrl = isAbsolute ? path : GA_ADMIN_API_BASE + path;

  const method = options.method || "GET";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let body = options.body;
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  // Initial request
  let resp;
  try {
    resp = await fetch(finalUrl, { method, headers, body });
  } catch (err) {
    throw new Error("[gaAdmin] Could not reach Admin API endpoint.");
  }

  // Possibly refresh once
  if (resp.status === 401 || resp.status === 403) {
    await maybeRefreshToken();
    const fresh = getToken()?.access_token || getToken()?.token;
    if (!fresh) {
      throw new Error("[gaAdmin] Token refresh also failed. Not logged in?");
    }
    const retryHeaders = { ...headers, Authorization: `Bearer ${fresh}` };
    try {
      resp = await fetch(finalUrl, { method, headers: retryHeaders, body });
    } catch (err2) {
      throw new Error("[gaAdmin] Admin fetch failed after refresh.");
    }
    if (!resp.ok) {
      const txt2 = await resp.text().catch(() => "");
      throw new Error(`[gaAdmin] Admin API Error (2nd try) ${resp.status}: ${txt2}`);
    }
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`[gaAdmin] Admin API Error ${resp.status}: ${txt}`);
  }

  try {
    return await resp.json();
  } catch (err) {
    throw new Error("[gaAdmin] Could not parse Admin API JSON.");
  }
}

// -----------------------------------------------------------------------
// Public: login => verifies token by calling listAccounts on Admin API
// -----------------------------------------------------------------------
export async function login(customCreds = {}) {
  try {
    // reset
    setClientSecret(null);
    setToken(null);

    await ensureCredentialsLoaded(customCreds);

    // Minimal check => call Admin API to confirm token => /v1beta/accounts
    await listAccounts();

    _lastLoginStatus = true;
    return { success: true, message: "[ga] GA login verified via v1beta admin API!" };
  } catch (err) {
    _lastLoginStatus = false;
    throw new Error(`[ga.login] ${err.message}`);
  }
}

export function getLoginStatus() {
  return _lastLoginStatus;
}

/**
 * test => just calls login() with no arguments
 */
export async function test() {
  return login({});
}

// -----------------------------------------------------------------------
// GA ADMIN API calls (v1beta)
// -----------------------------------------------------------------------

/**
 * Lists all accounts the user can access: GET /v1beta/accounts
 */
export async function listAccounts() {
  return gaAdminFetch("/accounts", { method: "GET" });
}

/**
 * Lists all accountSummaries: GET /v1beta/accountSummaries
 */
export async function listAccountSummaries() {
  return gaAdminFetch("/accountSummaries", { method: "GET" });
}

/**
 * Lists properties for the specified account. 
 * GA Admin v1beta does not allow `/accounts/{id}/properties`.
 * Instead, we do GET /v1beta/properties?filter=parent:accounts/{id}
 */
export async function listProperties(accountId, pageSize, pageToken) {
  if (!accountId) {
    throw new Error("[ga] listProperties: missing accountId param");
  }
  // filter=parent:accounts/XXXX
  const parts = [];
  parts.push("filter=parent:accounts/" + encodeURIComponent(accountId));
  if (pageSize) parts.push(`pageSize=${pageSize}`);
  if (pageToken) parts.push(`pageToken=${encodeURIComponent(pageToken)}`);

  let qs = parts.length ? ("?" + parts.join("&")) : "";
  const path = "/properties" + qs; // => /v1beta/properties?filter=parent:accounts/1234
  return gaAdminFetch(path, { method: "GET" });
}

// -----------------------------------------------------------------------
// GA DATA API calls (v1beta)
// -----------------------------------------------------------------------

/**
 * runReport => POST /v1beta/properties/{property}:runReport
 */
export async function runReport(propertyName, body) {
  if (!propertyName) {
    throw new Error("[ga] runReport: missing propertyName");
  }
  const path = `/${propertyName}:runReport`;  // e.g. /properties/1234:runReport
  return gaFetch(path, { method: "POST", body });
}

/**
 * runPivotReport => POST /v1beta/properties/{property}:runPivotReport
 */
export async function runPivotReport(propertyName, body) {
  if (!propertyName) throw new Error("[ga] runPivotReport: missing propertyName");
  const path = `/${propertyName}:runPivotReport`;
  return gaFetch(path, { method: "POST", body });
}

/**
 * batchRunReports => POST /v1beta/properties/{property}:batchRunReports
 */
export async function batchRunReports(propertyName, body) {
  if (!propertyName) throw new Error("[ga] batchRunReports: missing propertyName");
  const path = `/${propertyName}:batchRunReports`;
  return gaFetch(path, { method: "POST", body });
}

/**
 * batchRunPivotReports => POST /v1beta/properties/{property}:batchRunPivotReports
 */
export async function batchRunPivotReports(propertyName, body) {
  if (!propertyName) throw new Error("[ga] batchRunPivotReports: missing propertyName");
  const path = `/${propertyName}:batchRunPivotReports`;
  return gaFetch(path, { method: "POST", body });
}

/**
 * runRealtimeReport => POST /v1beta/properties/{property}:runRealtimeReport
 */
export async function runRealtimeReport(propertyName, body) {
  if (!propertyName) throw new Error("[ga] runRealtimeReport: missing propertyName");
  const path = `/${propertyName}:runRealtimeReport`;
  return gaFetch(path, { method: "POST", body });
}

/**
 * getMetadata => GET /v1beta/properties/{property}/metadata
 */
export async function getMetadata(name) {
  if (!name) {
    throw new Error("[ga] getMetadata: missing name param");
  }
  // e.g. name="properties/0" => /properties/0/metadata
  const path = `/${name}/metadata`;
  return gaFetch(path, { method: "GET" });
}

/**
 * checkCompatibility => POST /v1beta/properties/{property}:checkCompatibility
 */
export async function checkCompatibility(propertyName, body) {
  if (!propertyName) throw new Error("[ga] checkCompatibility: missing propertyName");
  const path = `/${propertyName}:checkCompatibility`;
  return gaFetch(path, { method: "POST", body });
}

// -----------------------------------------------------------------------
// Audience Exports (v1beta) - for completeness if your code uses them
// -----------------------------------------------------------------------
export async function createAudienceExport(parent, audienceExportBody) {
  if (!parent) throw new Error("[ga] createAudienceExport: missing parent");
  // POST /v1beta/{parent}/audienceExports
  const path = `/${parent}/audienceExports`;
  return gaFetch(path, { method: "POST", body: audienceExportBody });
}

export async function getAudienceExport(name) {
  if (!name) throw new Error("[ga] getAudienceExport: missing name");
  const path = `/${name}`;
  return gaFetch(path, { method: "GET" });
}

export async function queryAudienceExport(name, queryBody) {
  if (!name) throw new Error("[ga] queryAudienceExport: missing name");
  const path = `/${name}:query`;
  return gaFetch(path, { method: "POST", body: queryBody });
}

export async function listAudienceExports(parent, pageSize, pageToken) {
  if (!parent) throw new Error("[ga] listAudienceExports: missing parent");
  let url = `/${parent}/audienceExports`;
  const params = [];
  if (pageSize) params.push(`pageSize=${pageSize}`);
  if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
  if (params.length) {
    url += "?" + params.join("&");
  }
  return gaFetch(url, { method: "GET" });
}
