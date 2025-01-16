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
    const clientSecret = await getCredential(service, clientSecretType); // Changed variable name
    console.log('🔐 Client secret loaded:', clientSecret ? '✅' : '❌');
    
    if (!tokenCred || !tokenCred.contents) {
      throw new Error(
        `[gsc] Could not load token from key "${customCreds}". Check your credential manager.`
      );
    }
    
    if (!clientSecret || !clientSecret.contents) { // Using renamed variable
      throw new Error(
        `[gsc] No client_secret found under default "${service}/${clientSecretType}".`
      );
    }
 

    // Assign
    _clientSecret = {
      ...clientSecret.contents, // FIXED: was incorrectly using clientCred
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
 * A simple fetch wrapper that uses the loaded token's access_token or token,
 * with no refresh attempt.
 */
async function gscFetch(path, options = {}) {
  console.log('🌐 ==========================================');
  console.log('🌐 GSC API REQUEST STARTING');
  console.log('🌐 ==========================================');
  
  // Debug current token state
  console.log('🔑 Raw Token Object:', _token);

  // Fix: Handle nested token structure
  const actualToken = _token?.token || _token?.access_token;
  if (!actualToken) {
    console.error('❌ No valid token available');
    console.error('Current token structure:', _token);
    throw new Error("[gsc] Missing or invalid access_token in memory. Possibly not logged in?");
  }

  const url = `${GSC_API_BASE}${path}`;
  
  // Prepare request details with correct token
  const headers = {
    Authorization: `Bearer ${actualToken}`,
    "Content-Type": "application/json"
  };

  // Log complete request details
  console.log('🌐 Full Request Details:', {
    url,
    method: options.method || "GET",
    headers: {
      ...headers,
      Authorization: `Bearer ${actualToken.substring(0, 15)}...` // Show start of token
    }
  });

  // Create proper curl command
  const curlCmd = `curl -X ${options.method || 'GET'} '${url}' \
  -H 'Authorization: Bearer ${actualToken}' \
  -H 'Content-Type: application/json' \
  ${options.body ? `-d '${typeof options.body === 'string' ? options.body : JSON.stringify(options.body)}'` : ''} \
  --compressed`;
  
  console.log('🌐 Generated curl command:', curlCmd);

  let body = options.body;
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  console.log('🌐 Making request...');
  const resp = await fetch(url, {
    method: options.method || "GET",
    headers: { ...headers, ...(options.headers || {}) },
    body
  });

  console.log('🌐 Response received:', {
    status: resp.status,
    statusText: resp.statusText,
    headers: Object.fromEntries([...resp.headers.entries()])
  });

  if (!resp.ok) {
    const errorTxt = await resp.text().catch(() => "Unknown error body");
    console.error('❌ API Request Failed:', {
      status: resp.status,
      statusText: resp.statusText,
      error: errorTxt,
      path,
      requestBody: body ? JSON.parse(body) : undefined
    });
    throw new Error(`[gsc] GSC API Error ${resp.status}: ${errorTxt}`);
  }

  const data = await resp.json();
  console.log('🌐 ==========================================');
  console.log('✅ API Request Successful');
  console.log('🌐 Response data:', data);
  console.log('🌐 ==========================================');
  
  return data;
}

// -----------------------------------------------------------------------
// Date Utilities
// -----------------------------------------------------------------------
function getDateRange(range = 'last28days') {
  const end = new Date();
  const start = new Date();
  
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
      end = lastDayOfLastMonth;
      break;
    }
    case 'thisMonth':
      start.setDate(1);
      break;
    default:
      start.setDate(start.getDate() - 28); // Default to last 28 days
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
    // quick test => just call /sites:
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
  
  // Ensure dates are set
  const defaultRange = getDateRange();
  queryBody.startDate = queryBody.startDate || defaultRange.startDate;
  queryBody.endDate = queryBody.endDate || defaultRange.endDate;
  
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
// Sugar Methods
// -----------------------------------------------------------------------
export async function getTopQueries(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopQueries: missing siteUrl");
  
  const dates = getDateRange(options.dateRange);
  
  const body = {
    ...dates,
    dimensions: ["query"],
    rowLimit: options.rowLimit || 100,
    searchType: options.searchType || "web",
    type: options.type || "web",
    dataState: options.dataState || "all",
    dimensionFilterGroups: options.filters || [],
    aggregationType: options.aggregationType || "auto",
    metrics: options.metrics || ["clicks", "impressions", "ctr", "position"]
  };

  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPages(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopPages: missing siteUrl");
  
  const dates = getDateRange(options.dateRange);
  
  const body = {
    ...dates,
    dimensions: ["page"],
    rowLimit: options.rowLimit || 100,
    searchType: options.searchType || "web",
    type: options.type || "web",
    dataState: options.dataState || "all",
    dimensionFilterGroups: options.filters || [],
    aggregationType: options.aggregationType || "auto",
    metrics: options.metrics || ["clicks", "impressions", "ctr", "position"]
  };

  return querySearchAnalytics(siteUrl, body);
}

// Enhanced analytics methods
export async function getDetailedAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getDetailedAnalytics: missing siteUrl");

  const dates = getDateRange(options.dateRange);

  const body = {
    ...dates,
    dimensions: options.dimensions || ["query", "page", "device", "country"],
    rowLimit: options.rowLimit || 1000,
    searchType: options.searchType || "web",
    dataState: options.dataState || "all",
    dimensionFilterGroups: options.filters || []
  };

  return querySearchAnalytics(siteUrl, body);
}

export async function getTopPagesDetailed(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getTopPagesDetailed: missing siteUrl");

  const dates = getDateRange(options.dateRange);
  const {
    rowLimit = 1000,
    minClicks = 10,
    minImpressions = 100,
    minPosition = 0,
    maxPosition = 100
  } = options;

  const dimensionFilterGroups = [{
    filters: []
  }];

  if (minPosition || maxPosition) {
    dimensionFilterGroups[0].filters.push({
      dimension: "position",
      operator: "between",
      expression: minPosition,
      expression2: maxPosition
    });
  }

  return querySearchAnalytics(siteUrl, {
    ...dates,
    dimensions: ["page"],
    rowLimit,
    dimensionFilterGroups,
    aggregationType: "byPage",
    searchType: "web"
  });
}

export async function getQueryAnalyticsByPage(siteUrl, pageUrl, options = {}) {
  if (!siteUrl || !pageUrl) {
    throw new Error("[gsc] getQueryAnalyticsByPage: missing siteUrl or pageUrl");
  }

  const dates = getDateRange(options.dateRange);

  const dimensionFilterGroups = [{
    filters: [{
      dimension: "page",
      operator: "equals",
      expression: pageUrl
    }]
  }];

  return querySearchAnalytics(siteUrl, {
    ...dates,
    dimensions: ["query", "device", "country"],
    rowLimit: options.rowLimit || 1000,
    dimensionFilterGroups
  });
}

export async function getDeviceAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getDeviceAnalytics: missing siteUrl");

  const dates = getDateRange(options.dateRange);

  return querySearchAnalytics(siteUrl, {
    ...dates,
    dimensions: ["device"],
    rowLimit: options.rowLimit || 1000,
    aggregationType: "byDevice"
  });
}

export async function getCountryAnalytics(siteUrl, options = {}) {
  if (!siteUrl) throw new Error("[gsc] getCountryAnalytics: missing siteUrl");

  const dates = getDateRange(options.dateRange);

  const dimensionFilterGroups = [];
  if (options.minClicks > 0) {
    dimensionFilterGroups.push({
      filters: [{
        dimension: "clicks",
        operator: "greaterThan",
        expression: options.minClicks.toString()
      }]
    });
  }

  return querySearchAnalytics(siteUrl, {
    ...dates,
    dimensions: ["country"],
    rowLimit: options.rowLimit || 1000,
    dimensionFilterGroups,
    aggregationType: "byCountry"
  });
}
