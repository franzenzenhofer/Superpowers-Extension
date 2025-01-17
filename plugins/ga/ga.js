// ga.js
// -------------------------------------------------------------------------
// Provides internal logic for Google Analytics Data API usage, with robust checks.
// -------------------------------------------------------------------------

import { 
  ensureCredentialsLoaded, 
  maybeRefreshToken,
  getToken,
  getClientSecret,
  setToken,
  setClientSecret
} from "./auth.js";

// GA Data API base
const GA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

// Keep lastLoginStatus in this file
let _lastLoginStatus = false;

/**
 * Helper: asserts that a given parameter is a non-empty string.
 */
function assertNonEmptyString(value, paramName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[ga] ${paramName}: missing or invalid string`);
  }
}

/**
 * Single wrapper for GA endpoints. Retries once on 401/403 (refresh).
 */
async function gaFetch(path, options = {}) {
  // Possibly refresh token first
  await maybeRefreshToken();

  // Retrieve the current token from auth.js
  const token = getToken();
  const tokenString = token?.access_token || token?.token;
  if (!tokenString) {
    console.error("[gaFetch] No valid access token found. Possibly not logged in?");
    throw new Error("[ga] Missing or invalid token.");
  }

  const isAbsoluteUrl = path.startsWith("http");
  const finalUrl = isAbsoluteUrl ? path : (GA_API_BASE + path);
  const method = options.method || "POST"; // GA Data API typically uses POST for queries
  const headers = {
    Authorization: `Bearer ${tokenString}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let body = options.body;
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  // console.debug(`[gaFetch] Request => ${method} ${finalUrl}`, { headers, body });

  let resp;
  try {
    resp = await fetch(finalUrl, { method, headers, body });
  } catch (networkErr) {
    console.error("[gaFetch] Network/connection error:", networkErr);
    throw new Error("[ga] Failed to reach GA endpoint (network error).");
  }

  if (resp.status === 401 || resp.status === 403) {
    console.warn(`[gaFetch] Got ${resp.status}, attempting a token refresh...`);
    await maybeRefreshToken();

    const freshToken = getToken()?.access_token || getToken()?.token;
    if (!freshToken) {
      throw new Error("[gaFetch] No valid token even after refresh attempt.");
    }

    const retryHeaders = { ...headers, Authorization: `Bearer ${freshToken}` };

    let resp2;
    try {
      resp2 = await fetch(finalUrl, { method, headers: retryHeaders, body });
    } catch (networkErr) {
      console.error("[gaFetch] Network error on retry:", networkErr);
      throw new Error("[ga] Failed again after refresh (network error).");
    }

    if (!resp2.ok) {
      const errorTxt = await resp2.text().catch(() => "");
      throw new Error(`[ga] GA API Error (2nd try) ${resp2.status}: ${errorTxt}`);
    }

    // console.debug("[gaFetch] Retried fetch success.");
    try {
      return await resp2.json();
    } catch (parseErr) {
      console.error("[gaFetch] JSON parse error (2nd try):", parseErr);
      throw new Error("[ga] Could not parse GA response (2nd try).");
    }
  }

  if (!resp.ok) {
    const errorTxt = await resp.text().catch(() => "");
    throw new Error(`[ga] GA API Error ${resp.status}: ${errorTxt}`);
  }

  let data;
  try {
    data = await resp.json();
  } catch (parseErr) {
    console.error("[gaFetch] JSON parse error:", parseErr);
    throw new Error("[ga] Could not parse GA response.");
  }

  // console.debug("[gaFetch] Response OK:", data);
  return data;
}

/**
 * Public login/test
 */
export async function login(customCreds = {}) {
  try {
    // reset credentials
    setClientSecret(null);
    setToken(null);

    await ensureCredentialsLoaded(customCreds);
    // Quick test => just call /v1beta/properties:runReport on a dummy property?
    // Or simply trust that the token is valid. We'll do a minimal call:
    // For example, we can do a getMetadata on property=0 (common metadata).
    await getMetadata("properties/0/metadata");

    _lastLoginStatus = true;
    return { success: true, message: "[ga] GA login verified!" };
  } catch (err) {
    _lastLoginStatus = false;
    console.error('[ga/debug] Login failed:', err);
    throw new Error(`[ga.login] ${err.message}`);
  }
}

export function getLoginStatus() {
  return _lastLoginStatus;
}

export async function test() {
  return login({});
}

// -----------------------------------------------------------------------
// GA Data API calls
// -----------------------------------------------------------------------

/**
 * propertyName example: "properties/1234"
 * body => schema of RunReportRequest, see GA docs 
 */
export async function runReport(propertyName, body) {
  assertNonEmptyString(propertyName, "propertyName");
  // The GA Data API expects URL pattern: /v1beta/{+property}:runReport
  const path = `/${propertyName}:runReport`;
  return gaFetch(path, { method: "POST", body });
}

export async function runPivotReport(propertyName, body) {
  assertNonEmptyString(propertyName, "propertyName");
  const path = `/${propertyName}:runPivotReport`;
  return gaFetch(path, { method: "POST", body });
}

export async function batchRunReports(propertyName, body) {
  // For batch run, URL is: /v1beta/{+property}:batchRunReports
  // The request body is BatchRunReportsRequest
  assertNonEmptyString(propertyName, "propertyName");
  const path = `/${propertyName}:batchRunReports`;
  return gaFetch(path, { method: "POST", body });
}

export async function batchRunPivotReports(propertyName, body) {
  assertNonEmptyString(propertyName, "propertyName");
  const path = `/${propertyName}:batchRunPivotReports`;
  return gaFetch(path, { method: "POST", body });
}

export async function runRealtimeReport(propertyName, body) {
  assertNonEmptyString(propertyName, "propertyName");
  const path = `/${propertyName}:runRealtimeReport`;
  return gaFetch(path, { method: "POST", body });
}

/**
 * getMetadata - for property or "properties/0"
 */
export async function getMetadata(name) {
  assertNonEmptyString(name, "name");
  const path = `/${name}`;
  return gaFetch(path, { method: "GET" });
}

/**
 * checkCompatibility
 */
export async function checkCompatibility(propertyName, body) {
  assertNonEmptyString(propertyName, "propertyName");
  const path = `/${propertyName}:checkCompatibility`;
  return gaFetch(path, { method: "POST", body });
}

// -----------------------------------------------------------------------
// Audience Exports (examples from API specification, if you want them):
// -----------------------------------------------------------------------
export async function createAudienceExport(parent, audienceExportBody) {
  // parent = "properties/1234"
  // POST v1beta/{+parent}/audienceExports
  assertNonEmptyString(parent, "parent");
  const path = `/${parent}/audienceExports`;
  return gaFetch(path, { method: "POST", body: audienceExportBody });
}

export async function getAudienceExport(name) {
  // name = "properties/1234/audienceExports/5678"
  assertNonEmptyString(name, "name");
  const path = `/${name}`;
  return gaFetch(path, { method: "GET" });
}

export async function queryAudienceExport(name, queryBody) {
  // POST v1beta/{+name}:query
  // name = "properties/1234/audienceExports/5678"
  assertNonEmptyString(name, "name");
  const path = `/${name}:query`;
  return gaFetch(path, { method: "POST", body: queryBody });
}

export async function listAudienceExports(parent, pageSize, pageToken) {
  // GET v1beta/{+parent}/audienceExports
  // parent = "properties/1234"
  assertNonEmptyString(parent, "parent");
  let url = `/${parent}/audienceExports`;
  const params = [];
  if (pageSize) params.push(`pageSize=${pageSize}`);
  if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
  if (params.length) {
    url += "?" + params.join("&");
  }
  return gaFetch(url, { method: "GET" });
}
