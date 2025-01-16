// credentials_helpers.js
// Single credential per (service, type). Overwrites old credential if set again.
// Provides a minimal wrapper over chrome.storage.local for "superAuthCreds".

const STORE_KEY = 'superAuthCreds';

/**
 * Return ALL stored credentials (object):
 * {
 *   "google-searchconsole": {
 *     "client_secret.json": { id, filename, contents },
 *     "token.json": { id, filename, contents }
 *   },
 *   "google-analytics": { ... },
 *   ...
 * }
 */
export async function getAllCredentials() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORE_KEY], (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(res[STORE_KEY] || {});
    });
  });
}

/**
 * Return the single credential object for either:
 *   A) getCredential("someService", "someType")
 *   B) getCredential("superAuthCreds.someService.someType.json")
 *
 * In both cases, we unify the logic so that "someType" is actually looked for
 * with or without ".json". E.g. "token" => internally "token.json".
 *
 * Returns { id, filename, contents } or null if not found.
 */
export async function getCredential(serviceOrFullKey, maybeType) {
  console.log(`[getCredential] Searching for:`, { serviceOrFullKey, maybeType });

  // 1) Handle full key path
  if (
    arguments.length === 1 &&
    typeof serviceOrFullKey === 'string' &&
    serviceOrFullKey.startsWith(`${STORE_KEY}.`)
  ) {
    const stripped = serviceOrFullKey.slice(STORE_KEY.length + 1);
    const dotIndex = stripped.indexOf('.');
    
    if (dotIndex < 1) {
      console.warn(`[getCredential] Malformed key path: ${serviceOrFullKey}`);
      await logAllCredentials();
      return null;
    }

    const service = stripped.substring(0, dotIndex);
    const typePart = stripped.substring(dotIndex + 1);
    
    console.log(`[getCredential] Parsed path:`, { service, typePart });
    return getCredentialByParts(service, typePart);
  }

  // 2) Handle service + type
  if (typeof serviceOrFullKey === 'string' && typeof maybeType === 'string') {
    console.log(`[getCredential] Using direct service/type:`, { service: serviceOrFullKey, type: maybeType });
    return getCredentialByParts(serviceOrFullKey, maybeType);
  }

  console.warn(`[getCredential] Invalid arguments:`, { serviceOrFullKey, maybeType });
  await logAllCredentials();
  return null;
}

// Add helper function to log all credentials
async function logAllCredentials() {
  console.log('Available credential keys:');
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORE_KEY));
  if (keys.length === 0) {
    console.log('No credentials found in storage');
  } else {
    keys.forEach(k => console.log(`- ${k}`));
  }
}

/**
 * Internal helper that does the actual "service + type" => credential lookup.
 * We store everything with .json appended, but also check a no-extension fallback.
 */
async function getCredentialByParts(service, type) {
  const all = await getAllCredentials();
  if (!all[service]) return null;

  // If user passes "token", it might be stored as "token.json", or vice versa
  const typeWithJson = type.endsWith('.json') ? type : (type + '.json');
  const typeWithoutJson = type.replace(/\.json$/, '');

  if (all[service][typeWithJson]) {
    return all[service][typeWithJson];
  }
  if (all[service][typeWithoutJson]) {
    return all[service][typeWithoutJson];
  }
  return null;
}

/**
 * Set (or overwrite) the credential for (service, type).
 * "type" can be "token", "client_secret", or "other". We'll store it as "token.json", etc.
 *
 * The credential must be:
 *   { id: string, filename: string, contents: object }
 */
export async function setCredential(service, type, credObj) {
  return new Promise(async (resolve, reject) => {
    let all;
    try {
      all = await getAllCredentials();
    } catch (err) {
      return reject(err);
    }

    // We always append '.json'
    const storageType = type.endsWith('.json') ? type : type + '.json';

    if (!all[service]) {
      all[service] = {};
    }
    all[service][storageType] = credObj;

    chrome.storage.local.set({ [STORE_KEY]: all }, () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(true);
    });
  });
}

/**
 * Remove the single credential for (service, type).
 * - If type includes '.json', we try that. If not, we also try with and without.
 * Returns true if removed, false if not found.
 */
export async function removeCredential(service, type) {
  return new Promise(async (resolve, reject) => {
    try {
      const all = await getAllCredentials();
      if (!all[service]) {
        return resolve(false);
      }

      const typeWithJson = type.endsWith('.json') ? type : (type + '.json');
      const typeWithoutJson = type.replace(/\.json$/, '');

      let removed = false;
      if (all[service][typeWithJson]) {
        delete all[service][typeWithJson];
        removed = true;
      }
      if (all[service][typeWithoutJson]) {
        delete all[service][typeWithoutJson];
        removed = true;
      }

      // If that leaves no credential in the service, remove the service entirely
      if (Object.keys(all[service]).length === 0) {
        delete all[service];
      }

      await chrome.storage.local.set({ [STORE_KEY]: all });
      resolve(removed);
    } catch (err) {
      reject(err);
    }
  });
}

// Optional fallback for non-module usage
if (typeof window !== 'undefined' && !window.CredentialHelpers) {
  window.CredentialHelpers = {
    getAllCredentials,
    getCredential,
    setCredential,
    removeCredential
  };
}
