// auth.js
// -------------------------------------------------------------------------
// Handles loading and refreshing Google Analytics OAuth credentials.
// -------------------------------------------------------------------------

import { loadOAuthCredentials, refreshOAuthToken } from "../../scripts/auth_helpers.js";

/**
 * Module-scoped credentials storage
 */
let _clientSecret = null;
let _token = null;

/**
 * Getter/Setter for clientSecret & token
 */
export function getClientSecret() {
  return _clientSecret;
}
export function setClientSecret(newSecret) {
  _clientSecret = newSecret;
}
export function getToken() {
  return _token;
}
export function setToken(newToken) {
  _token = newToken;
}

/**
 * GA-specific credentials loading
 */
export async function ensureCredentialsLoaded(customCreds = {}) {
  // If credentials are already loaded for the same service, skip
  if (_clientSecret && _token &&
      _clientSecret.serviceKey === customCreds.service &&
      _token.serviceKey === customCreds.service) {
    return;
  }

  // Default to "google-analytics"
  const credentials = await loadOAuthCredentials({
    service: customCreds.service || "google-analytics",
    clientSecretType: customCreds.clientSecretType || "client_secret",
    tokenType: customCreds.tokenType || "token",
    customTokenKey: typeof customCreds === "string" ? customCreds : null
  });

  _clientSecret = credentials.clientSecret;
  _token = credentials.token;
}

/**
 * GA-specific token refresh
 */
export async function maybeRefreshToken() {
  if (!_token || !_clientSecret) {
    // console.debug("[ga/refresh] No credentials in memory, skipping refresh.");
    return;
  }

  const updatedToken = await refreshOAuthToken({
    token: _token,
    clientSecret: _clientSecret,
    service: _clientSecret.serviceKey,
    tokenType: "token"
  });

  _token = updatedToken;
}
