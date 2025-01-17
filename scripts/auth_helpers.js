import { getCredential, setCredential } from "./credentials_helpers.js";

/**
 * Load OAuth2 credentials from storage.
 * @param {Object} options
 * @param {string} options.service - Service name (e.g., "google-searchconsole")
 * @param {string} options.clientSecretType - Type of client secret (default: "client_secret")
 * @param {string} options.tokenType - Type of token (default: "token")
 * @param {string} [options.customTokenKey] - Optional direct token key path
 */
export async function loadOAuthCredentials({ 
  service, 
  clientSecretType = "client_secret", 
  tokenType = "token",
  customTokenKey = null 
}) {
  if (customTokenKey) {
    const tokenCred = await getCredential(customTokenKey);
    const clientSecret = await getCredential(service, clientSecretType);

    if (!tokenCred?.contents) {
      throw new Error(
        `Could not load token from key "${customTokenKey}". Check your credential manager.`
      );
    }

    if (!clientSecret?.contents) {
      throw new Error(
        `No client_secret found under default "${service}/${clientSecretType}".`
      );
    }

    return {
      clientSecret: {
        ...clientSecret.contents,
        serviceKey: service
      },
      token: {
        ...tokenCred.contents,
        serviceKey: "[stringKey]"
      }
    };
  }

  const clientSecretCred = await getCredential(service, clientSecretType);
  const tokenCred = await getCredential(service, tokenType);

  if (!clientSecretCred?.contents) {
    throw new Error(
      `No client secret found in "${service}/${clientSecretType}". Please add it in the credential manager.`
    );
  }
  if (!tokenCred?.contents) {
    throw new Error(
      `No token found in "${service}/${tokenType}". Please add it in the credential manager.`
    );
  }

  return {
    clientSecret: { ...clientSecretCred.contents, serviceKey: service },
    token: { ...tokenCred.contents, serviceKey: service }
  };
}

/**
 * Refresh an OAuth2 token if needed.
 * @param {Object} params
 * @param {Object} params.token - Current token object
 * @param {Object} params.clientSecret - Client secret object
 * @param {string} params.service - Service name for storage
 * @param {string} params.tokenType - Token type for storage
 * @returns {Object} Updated token object if refreshed, or original if not needed
 */
export async function refreshOAuthToken({ token, clientSecret, service, tokenType = "token" }) {
  const storedRefreshToken = token.refresh_token || token.refreshToken;
  if (!storedRefreshToken) {
    console.warn("[oauth/refresh] No refresh_token available, cannot auto-refresh.");
    return token;
  }

  const actualClientId = token.client_id || clientSecret?.installed?.client_id || clientSecret?.web?.client_id;
  const actualClientSecret = token.client_secret || clientSecret?.installed?.client_secret || clientSecret?.web?.client_secret;

  if (!actualClientId || !actualClientSecret) {
    console.warn("[oauth/refresh] Missing client_id or client_secret, cannot refresh token.");
    return token;
  }

  let expiryDate = token.expiry_date;
  if (typeof expiryDate === "string") {
    try {
      expiryDate = new Date(expiryDate).getTime();
    } catch (err) {
      console.warn("[oauth/refresh] Could not parse expiry_date string:", token.expiry_date);
      expiryDate = 0;
    }
  }

  const now = Date.now();
  const safetyMarginMs = 2 * 60 * 1000; // 2 minutes
  
  if (!expiryDate || expiryDate <= now + safetyMarginMs) {
    try {
      const tokenUri = token.token_uri || "https://oauth2.googleapis.com/token";
      const postData = new URLSearchParams({
        client_id: actualClientId,
        client_secret: actualClientSecret,
        refresh_token: storedRefreshToken,
        grant_type: "refresh_token"
      });

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
      
      // Update token with new values
      const updatedToken = {
        ...token,
        access_token: newToken.access_token,
        expiry_date: Date.now() + (newToken.expires_in * 1000)
      };
      if (newToken.scope) updatedToken.scope = newToken.scope;
      if (newToken.refresh_token) updatedToken.refresh_token = newToken.refresh_token;

      // Store updated token
      await setCredential(service, tokenType, {
        id: token.id || "cred_" + Date.now(),
        filename: "token.json",
        contents: updatedToken
      });

      return updatedToken;
    } catch (err) {
      console.error("[oauth/refresh] Token refresh error:", err);
      return token;
    }
  }
  
  return token;
}
