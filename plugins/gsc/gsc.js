// gsc.js
// -------------------------------------------------------------------------
// Provides internal logic for Google Search Console usage, with robust checks.
// -------------------------------------------------------------------------

import { 
  ensureCredentialsLoaded, 
  maybeRefreshToken,
  getToken,
  getClientSecret,
  setToken,
  setClientSecret
} from "./auth.js";

// We still need these credential helpers for the entire flow in auth.js
// but the actual loading logic was moved to auth.js.
import { getCredential, setCredential } from "../../scripts/credentials_helpers.js";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

// Keep lastLoginStatus in this file
let _lastLoginStatus = false;

/**
 * Helper: Asserts that a given parameter is a non-empty string.
 */
function assertNonEmptyString(value, paramName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[gsc] ${paramName}: missing or invalid string`);
  }
}

/**
 * Single wrapper for GSC endpoints. Retries once on 401/403 (refresh).
 */
async function gscFetch(path, options = {}) {
  // Possibly refresh token first
  await maybeRefreshToken();

  // Retrieve the current token from auth.js
  const token = getToken();
  const tokenString = token?.access_token || token?.token;
  if (!tokenString) {
    console.error("[gscFetch] No valid access token found. Possibly not logged in?");
    throw new Error("[gsc] Missing or invalid token.");
  }

  const isAbsoluteUrl = path.startsWith("http");
  const finalUrl = isAbsoluteUrl ? path : (GSC_API_BASE + path);
  const method = options.method || "GET";
  const headers = {
    Authorization: `Bearer ${tokenString}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let body = options.body;
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  // console.debug(`[gscFetch] Request => ${method} ${finalUrl}`, { headers, body });

  let resp;
  try {
    resp = await fetch(finalUrl, { method, headers, body });
  } catch (networkErr) {
    console.error("[gscFetch] Network/connection error:", networkErr);
    throw new Error("[gsc] Failed to reach GSC endpoint (network error).");
  }

  // If 401 or 403, try refresh once, then retry.
  if (resp.status === 401 || resp.status === 403) {
    console.warn(`[gscFetch] Got ${resp.status}, attempting a token refresh...`);
    await maybeRefreshToken();

    const freshToken = getToken()?.access_token || getToken()?.token;
    if (!freshToken) {
      throw new Error("[gscFetch] No valid token even after refresh attempt.");
    }
    const retryHeaders = { ...headers, Authorization: `Bearer ${freshToken}` };

    let resp2;
    try {
      resp2 = await fetch(finalUrl, { method, headers: retryHeaders, body });
    } catch (networkErr) {
      console.error("[gscFetch] Network error on retry:", networkErr);
      throw new Error("[gsc] Failed again after refresh (network error).");
    }

    if (!resp2.ok) {
      const errorTxt = await resp2.text().catch(() => "");
      throw new Error(`[gsc] GSC API Error (2nd try) ${resp2.status}: ${errorTxt}`);
    }

    console.debug("[gscFetch] Retried fetch success.");
    try {
      return await resp2.json();
    } catch (parseErr) {
      console.error("[gscFetch] JSON parse error (2nd try):", parseErr);
      throw new Error("[gsc] Could not parse GSC response (2nd try).");
    }
  }

  if (!resp.ok) {
    const errorTxt = await resp.text().catch(() => "");
    throw new Error(`[gsc] GSC API Error ${resp.status}: ${errorTxt}`);
  }

  let data;
  try {
    data = await resp.json();
  } catch (parseErr) {
    console.error("[gscFetch] JSON parse error:", parseErr);
    throw new Error("[gsc] Could not parse GSC response.");
  }

  console.debug("[gscFetch] Response OK:", data);
  return data;
}

// -----------------------------------------------------------------------
// Date Utilities
// -----------------------------------------------------------------------
function getDateRange(range = 'last28days') {
  const end = new Date();
  let start = new Date();

  switch (range) {
    case 'today':
      break;
    case 'yesterday':
      end.setDate(end.getDate() - 1);
      start.setDate(start.getDate() - 1);
      break;
    case 'last7days':
      start.setDate(start.getDate() - 7);
      break;
    case 'last14days':
      start.setDate(start.getDate() - 14);
      break;
    case 'last28days':
      start.setDate(start.getDate() - 28);
      break;
    case 'last30days':
      start.setDate(start.getDate() - 30);
      break;
    case 'last90days':
      start.setDate(start.getDate() - 90);
      break;
    case 'lastMonth': {
      const lastMonth = new Date();
      lastMonth.setDate(1);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastDayOfLastMonth = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0
      );
      start = lastMonth;
      end.setTime(lastDayOfLastMonth.getTime());
      break;
    }
    case 'thisMonth':
      start.setDate(1);
      break;
    default:
      start.setDate(start.getDate() - 28);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

// -----------------------------------------------------------------------
// Public login/test
// -----------------------------------------------------------------------
export async function login(customCreds = {}) {
  // console.debug('[gsc/debug] Login attempt started:', { customCreds });
  try {
    // Reset credentials in auth.js
    setClientSecret(null);
    setToken(null);

    await ensureCredentialsLoaded(customCreds);
    // Quick test => just call /sites:
    await gscFetch("/sites", { method: "GET" });

    _lastLoginStatus = true;
    // console.debug('[gsc/debug] Login successful');
    return { success: true, message: "[gsc] GSC login verified!" };
  } catch (err) {
    _lastLoginStatus = false;
    console.error('[gsc/debug] Login failed:', err);
    throw new Error(`[gsc.login] ${err.message}`);
  }
}

export function getLoginStatus() {
  return _lastLoginStatus;
}

export async function test() {
  return login({});
}

// -----------------------------------------------------------------------
// Sites (official methods)
// -----------------------------------------------------------------------
export async function addSite(siteUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}`, { method: "PUT" });
}

export async function deleteSite(siteUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}`, { method: "DELETE" });
}

export async function getSite(siteUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}`, { method: "GET" });
}

export async function listSites() {
  return gscFetch("/sites", { method: "GET" });
}

// Legacy sugar alias for "getSite"
export async function getSiteInfo(siteUrl) {
  return getSite(siteUrl);
}

// -----------------------------------------------------------------------
// Search Analytics (official 'query')
// -----------------------------------------------------------------------
export async function querySearchAnalytics(siteUrl, queryBody) {
  assertNonEmptyString(siteUrl, "siteUrl");
  if (!queryBody || typeof queryBody !== "object") {
    throw new Error("[gsc] querySearchAnalytics: missing queryBody object");
  }
  if (!queryBody.startDate || !queryBody.endDate) {
    const defaultRange = getDateRange();
    queryBody.startDate = queryBody.startDate || defaultRange.startDate;
    queryBody.endDate = queryBody.endDate || defaultRange.endDate;
  }
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}/searchAnalytics/query`, {
    method: "POST",
    body: queryBody
  });
}

// -----------------------------------------------------------------------
// Sitemaps (delete, get, list, submit)
// -----------------------------------------------------------------------
export async function deleteSitemap(siteUrl, sitemapUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  assertNonEmptyString(sitemapUrl, "sitemapUrl");
  const siteEnc = encodeURIComponent(siteUrl);
  const mapEnc = encodeURIComponent(sitemapUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps/${mapEnc}`, { method: "DELETE" });
}

export async function getSitemap(siteUrl, sitemapUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  assertNonEmptyString(sitemapUrl, "sitemapUrl");
  const siteEnc = encodeURIComponent(siteUrl);
  const mapEnc = encodeURIComponent(sitemapUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps/${mapEnc}`, { method: "GET" });
}

export async function listSitemaps(siteUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const siteEnc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps`, { method: "GET" });
}

export async function submitSitemap(siteUrl, sitemapUrl) {
  assertNonEmptyString(siteUrl, "siteUrl");
  assertNonEmptyString(sitemapUrl, "sitemapUrl");
  const siteEnc = encodeURIComponent(siteUrl);
  const mapEnc = encodeURIComponent(sitemapUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps/${mapEnc}`, { method: "PUT" });
}

// -----------------------------------------------------------------------
// Helper for building request bodies for sugar methods
// -----------------------------------------------------------------------
function buildQueryBody(options = {}, dimensions = ["query"]) {
  const rowLimit = options.rowLimit || 100;
  const advancedRowLimit = options.defaultRowLimitIfMissing || rowLimit;

  const dates = {
    startDate: options.startDate || getDateRange().startDate,
    endDate: options.endDate || getDateRange().endDate
  };

  return {
    ...dates,
    dimensions,
    rowLimit: advancedRowLimit,
    type: options.type || "web",
    aggregationType: options.aggregationType || "auto",
    dimensionFilterGroups: options.filters || [],
    dataState: options.dataState || "all"
  };
}

// -----------------------------------------------------------------------
// Sugar Methods for Search Analytics
// -----------------------------------------------------------------------
export async function getTopQueries(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const body = buildQueryBody(options, ["query"]);
  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPages(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const body = buildQueryBody(options, ["page"]);
  return querySearchAnalytics(siteUrl, body);
}

export async function getDetailedAnalytics(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const body = buildQueryBody(
    { ...options, defaultRowLimitIfMissing: 1000 }, 
    options.dimensions || ["query", "page", "device", "country"]
  );
  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPagesDetailed(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const rowLimit = options.rowLimit || 1000;
  const baseBody = buildQueryBody(
    { ...options, rowLimit, defaultRowLimitIfMissing: rowLimit },
    ["page"]
  );
  baseBody.aggregationType = "byPage";
  return querySearchAnalytics(siteUrl, baseBody);
}

export async function getQueryAnalyticsByPage(siteUrl, pageUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  assertNonEmptyString(pageUrl, "pageUrl");
  const dimensionFilterGroups = [
    {
      filters: [
        {
          dimension: "page",
          operator: "equals",
          expression: pageUrl
        }
      ]
    }
  ];
  const body = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["query", "device", "country"]
  );
  body.dimensionFilterGroups = dimensionFilterGroups;
  return querySearchAnalytics(siteUrl, body);
}

export async function getDeviceAnalytics(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const body = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["device"]
  );
  return querySearchAnalytics(siteUrl, body);
}

export async function getCountryAnalytics(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const baseBody = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["country"]
  );
  return querySearchAnalytics(siteUrl, baseBody);
}

// -----------------------------------------------------------------------
// URL Inspection
//    Official method is "index.inspect" => we provide "inspectUrl"
// -----------------------------------------------------------------------
export async function inspectUrl(siteUrl, inspectionUrl, languageCode = 'en-US') {
  assertNonEmptyString(siteUrl, "siteUrl");
  assertNonEmptyString(inspectionUrl, "inspectionUrl");

  const body = {
    inspectionUrl,
    siteUrl,
    languageCode
  };
  // The /urlInspection endpoint is separate (v1), so we supply a full URL:
  return gscFetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    body
  });
}

// Sugar around the URL Inspection results
export async function getRichResults(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.richResultsResult || null;
}
export async function getAmpStatus(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.ampResult || null;
}
export async function getMobileUsability(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.mobileUsabilityResult || null;
}

// -----------------------------------------------------------------------
// Enhanced analytics with filters
// -----------------------------------------------------------------------
export async function getSearchAnalyticsByFilter(siteUrl, options = {}) {
  assertNonEmptyString(siteUrl, "siteUrl");
  const {
    startDate,
    endDate,
    dimensions = ['query'],
    filters = [],
    dataState = 'all',
    rowLimit = 1000,
    searchType,
    aggregationType = 'auto'
  } = options;

  const body = {
    startDate: startDate || getDateRange().startDate,
    endDate: endDate || getDateRange().endDate,
    dimensions,
    dimensionFilterGroups: filters.length ? [{ filters }] : [],
    type: searchType || 'web',
    dataState,
    rowLimit,
    aggregationType
  };

  return querySearchAnalytics(siteUrl, body);
}
