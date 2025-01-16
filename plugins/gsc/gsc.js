// gsc.js
// -------------------------------------------------------------------------
// Provides internal logic for Google Search Console usage.
// -------------------------------------------------------------------------

import { getCredential } from "../../scripts/credentials_helpers.js";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

let _clientSecret = null;
let _token = null;
let _lastLoginStatus = false;

/**
 * Ensure we've loaded the relevant credentials into _clientSecret and _token.
 * customCreds can be either:
 *   - an OBJECT with { service, clientSecretType, tokenType },
 *   - or a STRING like "superAuthCreds.google-searchconsole.token.json".
 * Otherwise, defaults to { service: "google-searchconsole", clientSecretType: "client_secret", tokenType: "token" }.
 */
async function ensureCredentialsLoaded(customCreds = {}) {
  console.log('🔐 =======================================');
  console.log('🔄 [FLOW] GSC: Starting credential load');
  console.log('🔐 =======================================');
  console.debug('[gsc/debug] Request params:', { customCreds });
  
  let service = "google-searchconsole";
  let clientSecretType = "client_secret";
  let tokenType = "token";

  // Case A: If customCreds is a string, interpret it as a direct storage key for the token.
  if (typeof customCreds === "string") {
    console.log('🔄 [FLOW] GSC: Loading token from custom key:', customCreds);
    const tokenCred = await getCredential(customCreds);
    console.log('🔄 [FLOW] GSC: Token load result:', tokenCred ? '✅' : '❌');
    
    console.log('🔑 Loading client secret...');
    const clientSecret = await getCredential(service, clientSecretType);
    console.log('🔐 Client secret loaded:', clientSecret ? '✅' : '❌');
    
    if (!tokenCred || !tokenCred.contents) {
      throw new Error(
        `[gsc] Could not load token from key "${customCreds}". Check your credential manager.`
      );
    }
    
    if (!clientSecret || !clientSecret.contents) {
      throw new Error(
        `[gsc] No client_secret found under default "${service}/${clientSecretType}".`
      );
    }
 
    // Assign
    _clientSecret = {
      ...clientSecret.contents,
      serviceKey: service
    };
    _token = {
      ...tokenCred.contents,
      serviceKey: "[stringKey]"
    };
    console.debug('[gsc/debug] Token loaded:', _token);
    console.log('🔓 CREDENTIALS LOADED SUCCESSFULLY');
    console.log('🔑 Token Details:', {
      type: 'directKey',
      hasAccessToken: !!_token.access_token,
      hasRefreshToken: !!_token.refresh_token,
      scopes: _token.scope || _token.scopes || []
    });
    return;
  }

  // Case B: If customCreds is an object, do normal destructuring
  console.log('🔄 [FLOW] GSC: Loading standard credentials');
  const {
    service: objService = "google-searchconsole",
    clientSecretType: objCsType = "client_secret",
    tokenType: objTkType = "token"
  } = customCreds;

  service = objService;
  clientSecretType = objCsType;
  tokenType = objTkType;

  // If already loaded with the same service, skip
  if (_clientSecret && _token && _clientSecret.serviceKey === service && _token.serviceKey === service) {
    return; // Already loaded
  }

  console.log('🔄 [FLOW] GSC: Service:', service);
  console.log('🔑 Loading credentials for service:', service);
  const clientSecretCred = await getCredential(service, clientSecretType);
  console.log('🔄 [FLOW] GSC: Client secret load result:', !!clientSecretCred?.contents);
  
  const tokenCred = await getCredential(service, tokenType);
  console.log('🔄 [FLOW] GSC: Token load result:', !!tokenCred?.contents);

  if (!clientSecretCred || !clientSecretCred.contents) {
    throw new Error(
      `[gsc] No client secret found in "${service}/${clientSecretType}". Please add it in the credential manager.`
    );
  }
  if (!tokenCred || !tokenCred.contents) {
    throw new Error(
      `[gsc] No GSC token found in "${service}/${tokenType}". Please add it in the credential manager.`
    );
  }

  _clientSecret = { ...clientSecretCred.contents, serviceKey: service };
  _token = { ...tokenCred.contents, serviceKey: service };

  console.log('🔐 =======================================');
  console.log('🔑 TOKEN STRUCTURE CHECK');
  console.log('🔐 =======================================');
  console.log('Raw token object:', _token);
  console.log('Token location check:', {
    hasDirectToken: !!_token.token,
    hasAccessToken: !!_token.access_token,
    tokenValue: _token.token || _token.access_token || 'NONE',
    isNested: !!(_token.token && typeof _token.token === 'string')
  });

  console.log('🔓 =======================================');
  console.log('🔑 CREDENTIALS LOADED SUCCESSFULLY');
  console.log('🔐 Service:', service);
  console.log('🔑 Token Details:', {
    hasAccessToken: !!_token.access_token,
    hasRefreshToken: !!_token.refresh_token,
    scopes: _token.scope || _token.scopes || [],
    expiryDate: _token.expiry_date || 'unknown'
  });
  console.log('🔓 =======================================');
  console.debug('[gsc/debug] Credentials loaded successfully:', {
    service,
    clientSecretType,
    tokenType,
    hasClientSecret: !!_clientSecret,
    hasToken: !!_token
  });
  console.debug('[gsc/debug] Token loaded:', _token);
}

/**
 * Checks if the token is expired or near expiry,
 * and if so, refreshes it using the refresh_token.
 * Updates the in-memory `_token` and also saves the updated token to storage.
 */
async function maybeRefreshToken() {
  // If there's no token or no refresh token, we can't refresh
  if (!_token) {
    console.debug("[gsc/refresh] No token in memory, skipping refresh.");
    return;
  }
  const storedRefreshToken = _token.refresh_token || _token.refreshToken;
  if (!storedRefreshToken) {
    console.debug("[gsc/refresh] No refresh_token available, cannot auto-refresh.");
    return;
  }

  // Derive clientId/secret from token or from _clientSecret fields
  const actualClientId = _token.client_id 
    || _clientSecret?.installed?.client_id 
    || _clientSecret?.web?.client_id;
  const actualClientSecret = _token.client_secret 
    || _clientSecret?.installed?.client_secret 
    || _clientSecret?.web?.client_secret;

  if (!actualClientId || !actualClientSecret) {
    console.warn("[gsc/refresh] Missing client_id or client_secret, cannot refresh token.");
    return;
  }

  // Convert expiry_date (could be a string or number). If no date, force refresh.
  let expiryDate = _token.expiry_date;
  if (typeof expiryDate === "string") {
    try {
      expiryDate = new Date(expiryDate).getTime();
    } catch (err) {
      console.warn("[gsc/refresh] Could not parse expiry_date string:", _token.expiry_date);
      expiryDate = 0; // Force immediate refresh if parse fails
    }
  }

  const now = Date.now();
  // Refresh if no expiry date or within a 2-minute safety window
  const safetyMarginMs = 2 * 60 * 1000;
  if (!expiryDate || expiryDate <= now + safetyMarginMs) {
    console.debug("[gsc/refresh] Token expired or near expiry, attempting refresh...");
    try {
      const tokenUri = _token.token_uri || "https://oauth2.googleapis.com/token";
      const postData = new URLSearchParams();
      postData.append("client_id", actualClientId);
      postData.append("client_secret", actualClientSecret);
      postData.append("refresh_token", storedRefreshToken);
      postData.append("grant_type", "refresh_token");

      const resp = await fetch(tokenUri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: postData
      });

      if (!resp.ok) {
        const errTxt = await resp.text();
        throw new Error(`Refresh failed: ${resp.status} - ${resp.statusText}\n${errTxt}`);
      }

      const newToken = await resp.json();
      console.debug("[gsc/refresh] Refresh response:", newToken);

      // Merge into the existing _token
      _token.access_token = newToken.access_token;
      if (newToken.expires_in) {
        _token.expiry_date = Date.now() + (newToken.expires_in * 1000);
      }
      if (newToken.scope) {
        _token.scope = newToken.scope;
      }
      // Some OAuth servers resend refresh_token, some don't—keep existing if not present
      if (newToken.refresh_token) {
        _token.refresh_token = newToken.refresh_token;
      }

      // Immediately persist updated token to storage so we don't lose it
      await setCredential("google-searchconsole", "token", {
        id: _token.id || ("cred_" + Date.now()),
        filename: "token.json",
        contents: _token
      });
      console.debug("[gsc/refresh] Token updated & saved to storage.");

      // After successful refresh, log it
      if (newToken) {
        const now = new Date().toISOString();
        console.log(`[Token] Refreshed at ${now}`);
      }

    } catch (err) {
      console.error("[gsc/refresh] Token refresh error:", err);
      // If refresh fails, user might need a full re-auth (login).
    }
  } else {
    console.debug("[gsc/refresh] Token still valid, no refresh needed.");
  }
}

/**
 * Wrapper for the GSC API. Uses the current token's access_token.
 * If we get a 401/403, we'll refresh and retry once.
 */
async function gscFetch(path, options = {}) {
  // Ensure token is loaded & possibly refresh it first
  await maybeRefreshToken();

  const tokenString = _token?.access_token || _token?.token;
  if (!tokenString) {
    console.error("[gscFetch] No valid access token found. Possibly not logged in?");
    throw new Error("[gsc] Missing or invalid token.");
  }

  const url = `${GSC_API_BASE}${path}`;
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

  console.debug(`[gscFetch] Request: ${method} ${url}`, { headers, body });
  const resp = await fetch(url, { method, headers, body });

  // If unauthorized, attempt one refresh and retry
  if (resp.status === 401 || resp.status === 403) {
    console.warn(`[gscFetch] Got ${resp.status}, attempting a token refresh...`);
    await maybeRefreshToken();

    // Retry with fresh token
    const freshToken = _token?.access_token || _token?.token;
    if (!freshToken) {
      throw new Error("[gscFetch] No valid token even after refresh attempt.");
    }
    const retryHeaders = { ...headers, Authorization: `Bearer ${freshToken}` };
    const resp2 = await fetch(url, { method, headers: retryHeaders, body });
    if (!resp2.ok) {
      const errorTxt = await resp2.text().catch(() => "");
      throw new Error(`[gsc] GSC API Error (2nd try) ${resp2.status}: ${errorTxt}`);
    }
    return resp2.json();
  }

  if (!resp.ok) {
    const errorTxt = await resp.text().catch(() => "");
    throw new Error(`[gsc] GSC API Error ${resp.status}: ${errorTxt}`);
  }

  const data = await resp.json();
  console.debug("[gscFetch] Response OK:", data);
  return data;
}


// -----------------------------------------------------------------------
// Date Utilities
// -----------------------------------------------------------------------
function getDateRange(range = 'last28days') {
  const end = new Date();
  let start = new Date();

  switch(range) {
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
      const lastDayOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
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
  console.debug('[gsc/debug] Login attempt started:', { customCreds });
  try {
    _clientSecret = null;
    _token = null;

    await ensureCredentialsLoaded(customCreds);
    // Quick test => just call /sites:
    await gscFetch("/sites", { method: "GET" });

    _lastLoginStatus = true;
    console.debug('[gsc/debug] Login successful');
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

/**
 * test() => calls login() with no args (default).
 */
export async function test() {
  return login({});
}

// -----------------------------------------------------------------------
// Core GSC calls
// -----------------------------------------------------------------------
export async function listSites() {
  console.debug('[gsc/debug] Listing sites');
  const results = await gscFetch("/sites");
  console.debug('[gsc/debug] Sites retrieved:', results);
  return results;
}

export async function getSiteInfo(siteUrl) {
  console.debug('[gsc/debug] Getting site info:', { siteUrl });
  if (!siteUrl) {
    console.error('[gsc/debug] getSiteInfo called without siteUrl');
    throw new Error("[gsc] getSiteInfo: missing siteUrl");
  }
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}`);
}

export async function querySearchAnalytics(siteUrl, queryBody) {
  if (!siteUrl) throw new Error("[gsc] querySearchAnalytics: missing siteUrl");
  
  // Ensure dates are set in the body
  if (!queryBody.startDate || !queryBody.endDate) {
    const defaultRange = getDateRange(); // default last28days
    queryBody.startDate = queryBody.startDate || defaultRange.startDate;
    queryBody.endDate = queryBody.endDate || defaultRange.endDate;
  }
  
  const enc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${enc}/searchAnalytics/query`, {
    method: "POST",
    body: queryBody
  });
}

export async function submitSitemap(siteUrl, sitemapUrl) {
  if (!siteUrl || !sitemapUrl) {
    throw new Error("[gsc] submitSitemap: need both siteUrl + sitemapUrl");
  }
  const siteEnc = encodeURIComponent(siteUrl);
  const mapEnc = encodeURIComponent(sitemapUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps/${mapEnc}`, { method: "PUT" });
}

export async function deleteSitemap(siteUrl, sitemapUrl) {
  if (!siteUrl || !sitemapUrl) {
    throw new Error("[gsc] deleteSitemap: need both siteUrl + sitemapUrl");
  }
  const siteEnc = encodeURIComponent(siteUrl);
  const mapEnc = encodeURIComponent(sitemapUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps/${mapEnc}`, { method: "DELETE" });
}

export async function listSitemaps(siteUrl) {
  if (!siteUrl) throw new Error("[gsc] listSitemaps: missing siteUrl");
  const siteEnc = encodeURIComponent(siteUrl);
  return gscFetch(`/sites/${siteEnc}/sitemaps`);
}

// -----------------------------------------------------------------------
// Helper for building request bodies in sugar methods
// -----------------------------------------------------------------------
function buildQueryBody(options = {}, dimensions = ["query"]) {
  // For sugar methods, default rowLimit can vary
  const rowLimit = options.rowLimit || 100;
  // For advanced methods, some use 1000 as default
  const advancedRowLimit = (options.defaultRowLimitIfMissing || rowLimit);

  const dates = {
    startDate: options.startDate || getDateRange().startDate,
    endDate: options.endDate || getDateRange().endDate
  };

  return {
    ...dates,
    dimensions,
    rowLimit: advancedRowLimit,
    // Only 'type' is valid now; searchType is deprecated
    // Valid type values: 'web', 'image', 'video', 'news', 'googleNews', 'discover'
    type: options.type || "web",

    // "aggregationType" can be "auto", "byPage", "byProperty", or "byNewsShowcasePanel"
    aggregationType: options.aggregationType || "auto",

    // dimensionFilterGroups is still valid for certain filters
    dimensionFilterGroups: options.filters || [],

    // The API doesn't need "metrics" array, ignoring it
    // dataState can be "final" or "all". "all" includes fresh data
    dataState: options.dataState || "all",
  };
}

// -----------------------------------------------------------------------
// Sugar Methods
// -----------------------------------------------------------------------
export async function getTopQueries(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopQueries: missing siteUrl");

  const body = buildQueryBody(options, ["query"]);
  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPages(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopPages: missing siteUrl");

  const body = buildQueryBody(options, ["page"]);
  return querySearchAnalytics(siteUrl, body);
}

// Enhanced analytics methods
export async function getDetailedAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getDetailedAnalytics: missing siteUrl");

  // Typically a higher rowLimit default, e.g. 1000
  const body = buildQueryBody(
    { ...options, defaultRowLimitIfMissing: 1000 }, 
    options.dimensions || ["query", "page", "device", "country"]
  );

  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPagesDetailed(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopPagesDetailed: missing siteUrl");

  // We remove the old "position" filter because it's not valid,
  // and the "between" operator is not recognized. So no custom filter now.
  const rowLimit = options.rowLimit || 1000;

  const baseBody = buildQueryBody(
    { ...options, rowLimit, defaultRowLimitIfMissing: rowLimit },
    ["page"]
  );

  // Aggregation can be "byPage" if we want to specifically group by page
  baseBody.aggregationType = "byPage";

  return querySearchAnalytics(siteUrl, baseBody);
}

export async function getQueryAnalyticsByPage(siteUrl, pageUrl, options = {}) {
  if (!siteUrl || !pageUrl) {
    throw new Error("[gsc] getQueryAnalyticsByPage: missing siteUrl or pageUrl");
  }

  // dimensionFilterGroups can only do limited operators: "equals", "contains", "notContains", "notEquals", "includingRegex", or "excludingRegex"
  const dimensionFilterGroups = [{
    filters: [{
      dimension: "page",
      operator: "equals",
      expression: pageUrl
    }]
  }];

  const body = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["query", "device", "country"]
  );

  body.dimensionFilterGroups = dimensionFilterGroups;
  return querySearchAnalytics(siteUrl, body);
}

export async function getDeviceAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getDeviceAnalytics: missing siteUrl");

  // aggregator can't be "byDevice"; let's just use "auto"
  const body = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["device"]
  );

  return querySearchAnalytics(siteUrl, body);
}

export async function getCountryAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getCountryAnalytics: missing siteUrl");

  // aggregator can't be "byCountry"; let's just use "auto"
  const dimensionFilterGroups = [];
  // minClicks-based filtering isn't standard with the new API (no "clicks" dimension).
  // So we skip that logic, or allow "query" dimension filters, etc.
  // For now, we remove minClicks entirely to avoid 400 error.

  const baseBody = buildQueryBody(
    { ...options, rowLimit: options.rowLimit || 1000 },
    ["country"]
  );

  // Do not use aggregator "byCountry" because that's invalid.
  // We'll just rely on "auto".
  baseBody.dimensionFilterGroups = dimensionFilterGroups;
  return querySearchAnalytics(siteUrl, baseBody);
}

// Add new URL Inspection API methods
export async function inspectUrl(siteUrl, inspectionUrl, languageCode = 'en-US') {
  if (!siteUrl || !inspectionUrl) {
    throw new Error("[gsc] inspectUrl: missing required parameters");
  }

  const body = {
    inspectionUrl,
    siteUrl,
    languageCode
  };

  return gscFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    body
  });
}

// Add Rich Results inspection
export async function getRichResults(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.richResultsResult || null;
}

// Add AMP inspection
export async function getAmpStatus(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.ampResult || null;
}

// Add Mobile usability inspection
export async function getMobileUsability(siteUrl, pageUrl) {
  const results = await inspectUrl(siteUrl, pageUrl);
  return results?.inspectionResult?.mobileUsabilityResult || null;
}

// Enhanced search analytics with more filtering
export async function getSearchAnalyticsByFilter(siteUrl, options = {}) {
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
