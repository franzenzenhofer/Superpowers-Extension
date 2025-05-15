> Last updated: Thursday, May 15, 2025 at 02:04 PM GMT+2


# Superpowers Browser Extension Documentation

----

## Introduction

----

Hello! Welcome to **Superpowers** — a powerful Chrome extension that injects a variety of enhanced APIs into webpage contexts. With **Superpowers**, you can perform cross-domain fetches, manage environment variables, handle tab interactions, capture screenshots, or even interact with AI models like OpenAI or Google's Gemini, all from within a standard web page!

This documentation provides a comprehensive reference for developers who want to leverage the capabilities of the Superpowers extension. By the end of this guide, you'll understand:

1. What **Superpowers** is and how its architecture works
2. How to properly initialize and use the extension in your web applications
3. Detailed API references for all available plugins and methods
4. Real-world usage examples to jumpstart your development

This document is structured in carefully delineated sections with cross-references and a comprehensive table of contents to help you navigate the extensive functionality available.

----

## Table of Contents

----

- [Introduction](#introduction)
- [What is Superpowers?](#what-is-superpowers)
- [Architecture Overview](#architecture-overview)
- [Quick Start / Enabling Superpowers](#quick-start--enabling-superpowers)
  - [Initialization Best Practices](#initialization-best-practices)
  - [Migrating Existing Code](#migrating-existing-code)
- [Plugins by Category](#plugins-by-category)
- [Plugin Reference](#plugin-reference)
  - [ga](#ga)
  - [gemini](#gemini)
  - [gsc](#gsc)
  - [storage](#storage)
  - [superaction](#superaction)
  - [superasyncrandominteger](#superasyncrandominteger)
  - [superconsoleintercept](#superconsoleintercept)
  - [superdebug](#superdebug)
  - [superdebugger](#superdebugger)
  - [superenv](#superenv)
  - [superfetch](#superfetch)
  - [superopenai](#superopenai)
  - [superpages](#superpages)
  - [superping](#superping)
  - [superpingasync](#superpingasync)
  - [superreadme](#superreadme)
  - [superruntime](#superruntime)
  - [superscreenshot](#superscreenshot)
  - [supersidepanel](#supersidepanel)
  - [superstorage](#superstorage)
  - [supertabs](#supertabs)
  - [superurlget](#superurlget)
  - [superwebnavigation](#superwebnavigation)
  - [superwebrequest](#superwebrequest)

- [Final Notes](#final-notes)

----

## What is Superpowers?

----

**Superpowers** is a Chrome extension that, when installed and running, injects a global `window.Superpowers` object into any page that opts in via a `<meta name="superpowers" content="enabled" />` tag in the `<head>`. The extension sets up secure bridging between the page context and the extension's service worker, allowing your web application to invoke powerful Chrome APIs that would ordinarily be inaccessible from standard JavaScript.

The extension follows a plugin-based architecture where each capability is encapsulated in its own plugin. This modular approach ensures that the extension remains maintainable, extendable, and secure.

----

## Architecture Overview

----

The Superpowers extension is built on a multi-layered architecture that ensures secure communication between different contexts:

1. **Service Worker (Background Script)**
   - The main background service worker for the extension
   - Runs with privileged browser permissions
   - Loads the plugin_manager, which registers each plugin's `install(...)` method
   - Routes messages from content scripts to appropriate plugin handlers
   - Executes privileged Chrome API calls on behalf of the page

2. **Content Scripts**
   - Auto-injected into tabs that have the Superpowers meta tag
   - Run in an isolated context with access to the page's DOM
   - Listen for messages from the page and relay them to the service worker
   - Facilitate two-way communication between the page and the service worker

3. **Page Context**
   - Contains the actual web application or page
   - Communicates with the extension through the `window.Superpowers` object
   - Initiates API calls that are bridged to the service worker

4. **Plugin Structure**
   Each plugin (e.g., superfetch, superenv, superopenai) typically consists of:
   - `extension.js`: Service worker logic with privileged access
   - `content.js`: Content script bridging code
   - `page.js`: Page-level code that exposes the API via `window.Superpowers.xxx`

This multi-layered approach ensures that privileged operations can be securely executed while maintaining appropriate isolation between contexts.

----

## Quick Start / Enabling Superpowers

----

To enable **Superpowers** in your web application:

1. **Ensure the extension is installed** in the user's Chrome browser.

2. **Add the required tags** in your page's `<head>` section:
```html
<meta name="superpowers" content="enabled"/>
<script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
```

3. **Initialize your application** using the `Superpowers.ready()` method:

```javascript
// Wait for Superpowers to be fully initialized
Superpowers.ready(function() {
  console.log("✅ Superpowers is fully ready!");

  // Now you can safely call any Superpowers methods
  Superpowers.fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => {
      console.log("API Response:", data);
      // Process your data here
    })
    .catch(error => console.error("Error:", error));
});

// Optionally handle initialization errors
Superpowers.readyerror(function(errorDetails) {
  console.error("❌ Superpowers failed to initialize:", errorDetails);
  // Show appropriate UI for when Superpowers isn't available
  document.getElementById('error-container').textContent = 
    'Please install the Superpowers extension to use this application.';
});
```

### Initialization Best Practices

For the most reliable initialization, follow these best practices:

1. **Always use the ready.js script** - This ensures proper setup and error handling.
2. **Use Superpowers.ready() for initialization** - This guarantees your code only runs when all plugins are available.
3. **Implement error handling with Superpowers.readyerror()** - This helps gracefully handle cases where the extension is not available.
4. **Avoid the deprecated timeout-based check** - The ready() method is more reliable and maintainable.

### Migrating Existing Code

If you have existing code that uses the old `setTimeout` pattern to check for Superpowers, here's how to migrate:

**Old approach (unreliable):**

```javascript
function checkSuperpowers() {
  if (window.Superpowers && window.Superpowers.fetch) {
    initializeApp();
  } else {
    setTimeout(checkSuperpowers, 300);
  }
}
setTimeout(checkSuperpowers, 300);

function initializeApp() {
  // App initialization code that uses Superpowers
}
```

**New approach (reliable):**

```javascript
// Move your initialization code into the ready callback
Superpowers.ready(function() {
  // Your initializeApp code goes here - it will only run when
  // Superpowers is fully ready, eliminating race conditions

  // For example:
  Superpowers.getEnvVars()
    .then(vars => {
      console.log("Environment variables:", vars);
      // Initialize your application with the environment variables
      setupApiClient(vars.API_KEY);
      configureLogging(vars.LOG_LEVEL);
    })
    .catch(err => console.error("Error loading environment:", err));
});

// Optionally handle initialization failures
Superpowers.readyerror(function(errorDetails) {
  console.error("Superpowers failed to initialize:", errorDetails);
  // Show appropriate UI for when Superpowers isn't available
  displayErrorMessage("Please install the Superpowers extension to use this application.");
});
```

This approach eliminates race conditions and provides better error handling.

----

## Plugins by Category

----

### Networking and External Communication

- **[superfetch](#superfetch)**: Provides a cross-origin, extension-powered fetch API for web pages, enabling advanced HTTP(S) requests (including those blocked by CORS) via the Superpowers Chrome extension.
- **[superpingasync](#superpingasync)**: Provides an asynchronous "ping" communication bridge between web pages and the Superpowers Chrome extension, enabling pages to send a message and receive a standardized "pong" response.
- **[superping](#superping)**: Provides a simple, synchronous "ping" mechanism for communication from the web page to the Superpowers extension.
- **[superwebrequest](#superwebrequest)**: Provides a secure, promise-based bridge from web pages to selected Chrome `webRequest` extension APIs, enabling advanced network request control and event handling from content scripts or page context via `window.
- **[superurlget](#superurlget)**: Provides programmatic, event-driven access to the rendered HTML, DOM, or text content of any publicly accessible URL, as loaded in a real browser tab.

### Data Storage and Management

- **[storage](#storage)**: Provides a unified, Promise-based interface to Chrome's `chrome.
- **[superenv](#superenv)**: The `superenv` plugin provides a robust, namespaced API for managing environment variables and multiple named environment sets in the browser, backed by extension storage.
- **[superstorage](#superstorage)**: No description available.

### User Interface and Interaction

- **[superscreenshot](#superscreenshot)**: Provides advanced screenshot capabilities to web pages via the Superpowers Chrome extension, allowing programmatic capture of visible or full-page screenshots from any tab or URL, with extensive configuration options.
- **[supertabs](#supertabs)**: Provides a secure, Promise-based bridge to the Chrome `chrome.
- **[supersidepanel](#supersidepanel)**: Provides a transparent bridge between in-page JavaScript and the Chrome `sidePanel` extension API, allowing web developers to control the browser's side panel (open, configure, query, etc.
- **[superwebnavigation](#superwebnavigation)**: Provides a secure, Promise-based interface for invoking Chrome's `chrome.

### Utility and Helper Functions

- **[superasyncrandominteger](#superasyncrandominteger)**: Provides an asynchronous method to generate a cryptographically weak random integer within a specified range, after a configurable delay.
- **[superdebug](#superdebug)**: Provides enhanced, centralized debug logging for web pages, allowing developers to send structured logs from the page context to the Superpowers extension for advanced inspection and debugging.
- **[superconsoleintercept](#superconsoleintercept)**: Enables interception and broadcasting of `console` log events across browser contexts (tabs, extension, etc.
- **[superdebugger](#superdebugger)**: Provides a secure, promise-based bridge to the Chrome `chrome.

### Third-party Service Integration

- **[ga](#ga)**: Provides a unified, promise-based JavaScript interface for interacting with Google Analytics Admin (v1beta) and Data (v1beta) APIs from web pages, including authentication, account/property listing, reporting, and audience export operations.
- **[gsc](#gsc)**: The `gsc` plugin integrates Google Search Console (GSC) capabilities into web pages via the `window.
- **[gemini](#gemini)**: The Superpowers Gemini plugin integrates Google's Gemini family of generative AI models directly into web pages via the `window.
- **[superopenai](#superopenai)**: The `superopenai` plugin integrates the OpenAI API into web pages via the Superpowers Chrome extension, exposing a comprehensive, promise-based API under `window.

### System and Browser APIs

- **[superaction](#superaction)**: Provides a secure, promise-based bridge for web pages to interact with the Chrome Extension's `chrome.
- **[superpages](#superpages)**: The "superpages" plugin provides a secure, extension-mediated mechanism for web pages to generate Blob URLs from arbitrary content, with optional filename and MIME type specification.
- **[superreadme](#superreadme)**: Provides programmatic access to the Superpowers extension’s bundled README files, enabling web pages to retrieve documentation (including LLM-specific and main README content) directly via the `window.
- **[superruntime](#superruntime)**: Provides a secure, promise-based bridge to selected [chrome.

----

## Plugin Reference



### ga
Type: Integration  
Purpose: Provides a unified, promise-based JavaScript interface for interacting with Google Analytics Admin (v1beta) and Data (v1beta) APIs from web pages, including authentication, account/property listing, reporting, and audience export operations. Exposed as `window.Superpowers.Ga`.

---

#### Public API

All methods are accessible via `window.Superpowers.Ga`. All methods (except `getLoginStatus`) return Promises and are asynchronous.

---

##### Superpowers.Ga.login(customCreds)
- Purpose: Authenticates the user for Google Analytics APIs using OAuth credentials. Verifies access by listing accounts. Must be called before any other API method.
- Parameters:
  - `customCreds` (Object, optional): Custom credential options.  
    - `service` (string, optional): Service key (default: `"google-analytics"`).
    - `clientSecretType` (string, optional): Client secret type (default: `"client_secret"`).
    - `tokenType` (string, optional): Token type (default: `"token"`).
    - `customTokenKey` (string, optional): Custom token key (rarely needed).
- Returns:  
  - Promise resolving to `{ success: true, message: string }` on successful login.
  - Rejects with `Error` if authentication fails.
- Example:
```javascript
Superpowers.Ga.login()
  .then(result => {
    console.log("GA login successful:", result.message);
  })
  .catch(error => {
    console.error("GA login failed:", error.message);
  });
```

---

##### Superpowers.Ga.getLoginStatus()
- Purpose: Returns the current login status (whether the last login attempt succeeded).
- Parameters: None
- Returns:  
  - `boolean`: `true` if authenticated, `false` otherwise.
- Example:
```javascript
if (Superpowers.Ga.getLoginStatus()) {
  console.log("User is authenticated with Google Analytics.");
} else {
  console.log("User is NOT authenticated.");
}
```

---

##### Superpowers.Ga.test()
- Purpose: Convenience method to test authentication. Equivalent to calling `login()` with default credentials.
- Parameters: None
- Returns:  
  - Promise resolving to `{ success: true, message: string }` if authentication is valid.
  - Rejects with `Error` if authentication fails.
- Example:
```javascript
Superpowers.Ga.test()
  .then(result => {
    console.log("GA test login successful:", result.message);
  })
  .catch(error => {
    console.error("GA test login failed:", error.message);
  });
```

---

##### Superpowers.Ga.listAccounts()
- Purpose: Lists all Google Analytics accounts accessible to the authenticated user.
- Parameters: None
- Returns:  
  - Promise resolving to the API response object (see [GA Admin API docs](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accounts/list)).
- Example:
```javascript
Superpowers.Ga.listAccounts()
  .then(accounts => {
    console.log("Accounts:", accounts);
  })
  .catch(error => {
    console.error("Failed to list accounts:", error.message);
  });
```

---

##### Superpowers.Ga.listAccountSummaries()
- Purpose: Lists account summaries for all accessible accounts.
- Parameters: None
- Returns:  
  - Promise resolving to the API response object.
- Example:
```javascript
Superpowers.Ga.listAccountSummaries()
  .then(summaries => {
    console.log("Account summaries:", summaries);
  })
  .catch(error => {
    console.error("Failed to list account summaries:", error.message);
  });
```

---

##### Superpowers.Ga.listProperties(accountId, pageSize, pageToken)
- Purpose: Lists properties for a specified account.
- Parameters:
  - `accountId` (string, required): The account ID (e.g., `"123456"`).
  - `pageSize` (number, optional): Maximum number of results to return.
  - `pageToken` (string, optional): Token for pagination.
- Returns:  
  - Promise resolving to the API response object.
- Example:
```javascript
Superpowers.Ga.listProperties('123456', 50)
  .then(properties => {
    console.log("Properties for account:", properties);
  })
  .catch(error => {
    console.error("Failed to list properties:", error.message);
  });
```

---

##### Superpowers.Ga.runReport(propertyName, body)
- Purpose: Runs a standard report for a given property.
- Parameters:
  - `propertyName` (string, required): Property resource name (e.g., `"properties/123456"`).
  - `body` (object, required): Report request body (see [GA Data API docs](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)).
- Returns:  
  - Promise resolving to the report response object.
- Example:
```javascript
Superpowers.Ga.runReport('properties/123456', {
  dateRanges: [{ startDate: '2023-01-01', endDate: '2023-01-31' }],
  dimensions: [{ name: 'country' }],
  metrics: [{ name: 'activeUsers' }]
})
  .then(report => {
    console.log("Report result:", report);
  })
  .catch(error => {
    console.error("Report failed:", error.message);
  });
```

---

##### Superpowers.Ga.runPivotReport(propertyName, body)
- Purpose: Runs a pivot report for a given property.
- Parameters:
  - `propertyName` (string, required): Property resource name.
  - `body` (object, required): Pivot report request body.
- Returns:  
  - Promise resolving to the pivot report response object.
- Example:
```javascript
Superpowers.Ga.runPivotReport('properties/123456', { /* ... */ })
  .then(result => {
    console.log("Pivot report:", result);
  })
  .catch(error => {
    console.error("Pivot report failed:", error.message);
  });
```

---

##### Superpowers.Ga.batchRunReports(propertyName, body)
- Purpose: Runs multiple reports in a single batch request for a property.
- Parameters:
  - `propertyName` (string, required): Property resource name.
  - `body` (object, required): Batch report request body.
- Returns:  
  - Promise resolving to the batch report response object.
- Example:
```javascript
Superpowers.Ga.batchRunReports('properties/123456', { /* ... */ })
  .then(result => {
    console.log("Batch report:", result);
  })
  .catch(error => {
    console.error("Batch report failed:", error.message);
  });
```

---

##### Superpowers.Ga.batchRunPivotReports(propertyName, body)
- Purpose: Runs multiple pivot reports in a single batch request for a property.
- Parameters:
  - `propertyName` (string, required): Property resource name.
  - `body` (object, required): Batch pivot report request body.
- Returns:  
  - Promise resolving to the batch pivot report response object.
- Example:
```javascript
Superpowers.Ga.batchRunPivotReports('properties/123456', { /* ... */ })
  .then(result => {
    console.log("Batch pivot reports:", result);
  })
  .catch(error => {
    console.error("Batch pivot reports failed:", error.message);
  });
```

---

##### Superpowers.Ga.runRealtimeReport(propertyName, body)
- Purpose: Runs a real-time report for a given property.
- Parameters:
  - `propertyName` (string, required): Property resource name.
  - `body` (object, required): Real-time report request body.
- Returns:  
  - Promise resolving to the real-time report response object.
- Example:
```javascript
Superpowers.Ga.runRealtimeReport('properties/123456', { /* ... */ })
  .then(result => {
    console.log("Realtime report:", result);
  })
  .catch(error => {
    console.error("Realtime report failed:", error.message);
  });
```

---

##### Superpowers.Ga.getMetadata(name)
- Purpose: Retrieves metadata for a specified property.
- Parameters:
  - `name` (string, required): Resource name (e.g., `"properties/123456"`).
- Returns:  
  - Promise resolving to the metadata response object.
- Example:
```javascript
Superpowers.Ga.getMetadata('properties/123456')
  .then(metadata => {
    console.log("Property metadata:", metadata);
  })
  .catch(error => {
    console.error("Failed to get metadata:", error.message);
  });
```

---

##### Superpowers.Ga.checkCompatibility(propertyName, body)
- Purpose: Checks compatibility of a report request for a given property.
- Parameters:
  - `propertyName` (string, required): Property resource name.
  - `body` (object, required): Compatibility check request body.
- Returns:  
  - Promise resolving to the compatibility check response object.
- Example:
```javascript
Superpowers.Ga.checkCompatibility('properties/123456', { /* ... */ })
  .then(result => {
    console.log("Compatibility check:", result);
  })
  .catch(error => {
    console.error("Compatibility check failed:", error.message);
  });
```

---

##### Superpowers.Ga.createAudienceExport(parent, audienceExportBody)
- Purpose: Creates a new audience export under the specified parent resource.
- Parameters:
  - `parent` (string, required): Parent resource name (e.g., `"properties/123456"`).
  - `audienceExportBody` (object, required): Audience export request body.
- Returns:  
  - Promise resolving to the created audience export object.
- Example:
```javascript
Superpowers.Ga.createAudienceExport('properties/123456', { /* ... */ })
  .then(exportObj => {
    console.log("Created audience export:", exportObj);
  })
  .catch(error => {
    console.error("Failed to create audience export:", error.message);
  });
```

---

##### Superpowers.Ga.getAudienceExport(name)
- Purpose: Retrieves a specific audience export by resource name.
- Parameters:
  - `name` (string, required): Audience export resource name.
- Returns:  
  - Promise resolving to the audience export object.
- Example:
```javascript
Superpowers.Ga.getAudienceExport('properties/123456/audienceExports/789')
  .then(exportObj => {
    console.log("Audience export:", exportObj);
  })
  .catch(error => {
    console.error("Failed to get audience export:", error.message);
  });
```

---

##### Superpowers.Ga.queryAudienceExport(name, queryBody)
- Purpose: Queries an audience export with a custom query.
- Parameters:
  - `name` (string, required): Audience export resource name.
  - `queryBody` (object, required): Query request body.
- Returns:  
  - Promise resolving to the query result object.
- Example:
```javascript
Superpowers.Ga.queryAudienceExport('properties/123456/audienceExports/789', { /* ... */ })
  .then(result => {
    console.log("Audience export query result:", result);
  })
  .catch(error => {
    console.error("Failed to query audience export:", error.message);
  });
```

---

##### Superpowers.Ga.listAudienceExports(parent, pageSize, pageToken)
- Purpose: Lists all audience exports under the specified parent resource.
- Parameters:
  - `parent` (string, required): Parent resource name (e.g., `"properties/123456"`).
  - `pageSize` (number, optional): Maximum number of results to return.
  - `pageToken` (string, optional): Token for pagination.
- Returns:  
  - Promise resolving to the list of audience exports.
- Example:
```javascript
Superpowers.Ga.listAudienceExports('properties/123

### storage
Type: Integration  
Purpose: Provides a unified, Promise-based interface to Chrome's `chrome.storage` APIs (`local`, `sync`, and `session`) directly from the web page context, including event subscription for storage changes. Enables robust, cross-context storage operations in Chrome extensions via `window.Superpowers.storage`.

---

#### Public API

##### Superpowers.storage.local.get(keys)
- Purpose: Retrieves one or more items from the `chrome.storage.local` area.
- Parameters:
  - `keys` (string | string[] | object | null):  
    - A string specifying a single key, an array of strings for multiple keys, an object specifying default values, or `null` to get the entire contents of storage.
- Returns:  
  - `Promise<object>`: Resolves to an object mapping keys to their values.
- Example:
```javascript
Superpowers.storage.local.get(['theme', 'fontSize'])
  .then(items => {
    console.log('Retrieved items:', items);
    // Example: { theme: 'dark', fontSize: 16 }
  })
  .catch(error => {
    console.error('Failed to get items:', error);
  });
```

---

##### Superpowers.storage.local.set(items)
- Purpose: Stores one or more key-value pairs in `chrome.storage.local`.
- Parameters:
  - `items` (object):  
    - An object mapping keys to the values to be stored.
- Returns:  
  - `Promise<void>`: Resolves when the operation completes.
- Example:
```javascript
Superpowers.storage.local.set({ theme: 'light', fontSize: 18 })
  .then(() => {
    console.log('Settings saved.');
  })
  .catch(error => {
    console.error('Failed to save settings:', error);
  });
```

---

##### Superpowers.storage.local.remove(keys)
- Purpose: Removes one or more items from `chrome.storage.local`.
- Parameters:
  - `keys` (string | string[]):  
    - A string specifying a single key or an array of strings for multiple keys to remove.
- Returns:  
  - `Promise<void>`: Resolves when the operation completes.
- Example:
```javascript
Superpowers.storage.local.remove('theme')
  .then(() => {
    console.log('Theme setting removed.');
  })
  .catch(error => {
    console.error('Failed to remove theme:', error);
  });
```

---

##### Superpowers.storage.local.clear()
- Purpose: Removes all items from `chrome.storage.local`.
- Parameters: None
- Returns:  
  - `Promise<void>`: Resolves when the storage area is cleared.
- Example:
```javascript
Superpowers.storage.local.clear()
  .then(() => {
    console.log('All local storage cleared.');
  })
  .catch(error => {
    console.error('Failed to clear local storage:', error);
  });
```

---

##### Superpowers.storage.local.getBytesInUse(keys)
- Purpose: Computes the amount of storage space (in bytes) used by one or more items in `chrome.storage.local`.
- Parameters:
  - `keys` (string | string[] | null):  
    - A string specifying a single key, an array of strings for multiple keys, or `null` to get the total usage for the entire storage area.
- Returns:  
  - `Promise<number>`: Resolves to the number of bytes in use.
- Example:
```javascript
Superpowers.storage.local.getBytesInUse(null)
  .then(bytes => {
    console.log('Total bytes in use:', bytes);
  })
  .catch(error => {
    console.error('Failed to get bytes in use:', error);
  });
```

---

##### Superpowers.storage.sync.get(keys)
- Purpose: Same as `local.get`, but operates on `chrome.storage.sync`.
- Parameters: See `local.get`.
- Returns: `Promise<object>`
- Example:
```javascript
Superpowers.storage.sync.get('userProfile')
  .then(profile => {
    console.log('User profile:', profile);
  });
```

---

##### Superpowers.storage.sync.set(items)
- Purpose: Same as `local.set`, but operates on `chrome.storage.sync`.
- Parameters: See `local.set`.
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.storage.sync.set({ notifications: true });
```

---

##### Superpowers.storage.sync.remove(keys)
- Purpose: Same as `local.remove`, but operates on `chrome.storage.sync`.
- Parameters: See `local.remove`.
- Returns: `Promise<void>`

---

##### Superpowers.storage.sync.clear()
- Purpose: Same as `local.clear`, but operates on `chrome.storage.sync`.
- Parameters: None
- Returns: `Promise<void>`

---

##### Superpowers.storage.sync.getBytesInUse(keys)
- Purpose: Same as `local.getBytesInUse`, but operates on `chrome.storage.sync`.
- Parameters: See `local.getBytesInUse`.
- Returns: `Promise<number>`

---

##### Superpowers.storage.session.get(keys)
- Purpose: Same as `local.get`, but operates on `chrome.storage.session`.
- Parameters: See `local.get`.
- Returns: `Promise<object>`

---

##### Superpowers.storage.session.set(items)
- Purpose: Same as `local.set`, but operates on `chrome.storage.session`.
- Parameters: See `local.set`.
- Returns: `Promise<void>`

---

##### Superpowers.storage.session.remove(keys)
- Purpose: Same as `local.remove`, but operates on `chrome.storage.session`.
- Parameters: See `local.remove`.
- Returns: `Promise<void>`

---

##### Superpowers.storage.session.clear()
- Purpose: Same as `local.clear`, but operates on `chrome.storage.session`.
- Parameters: None
- Returns: `Promise<void>`

---

##### Superpowers.storage.session.getBytesInUse(keys)
- Purpose: Same as `local.getBytesInUse`, but operates on `chrome.storage.session`.
- Parameters: See `local.getBytesInUse`.
- Returns: `Promise<number>`

---

##### Superpowers.storage.on(eventName, handler)
- Purpose: Subscribes to storage events. Currently supports `"onChanged"` for changes in any storage area.
- Parameters:
  - `eventName` (string):  
    - The event to listen for. Only `"onChanged"` is supported.
  - `handler` (function):  
    - Callback function invoked with `(changes, areaName)` when the event occurs.
      - `changes` (object): Maps changed keys to `{ oldValue, newValue }` objects.
      - `areaName` (string): The storage area name (`"local"`, `"sync"`, or `"session"`).
- Returns: `void`
- Example:
```javascript
function handleStorageChange(changes, areaName) {
  console.log('Storage changed in', areaName, changes);
}

Superpowers.storage.on('onChanged', handleStorageChange);

// Later, to unsubscribe:
Superpowers.storage.off('onChanged', handleStorageChange);
```

---

##### Superpowers.storage.off(eventName, handler)
- Purpose: Unsubscribes a previously registered handler from a storage event.
- Parameters:
  - `eventName` (string): The event name, e.g., `"onChanged"`.
  - `handler` (function): The handler function to remove.
- Returns: `void`

---

#### Caveats & Edge Cases

- **Storage Area Support:**  
  - `chrome.storage.session` is only available in Manifest V3 and may not be supported in all environments.
  - If a storage area or method is unavailable, the returned Promise will reject with an error.
- **Quota Limits:**  
  - All Chrome storage areas have quota limits. Exceeding these will cause operations to fail.
- **Error Handling:**  
  - Always use `.catch()` on returned Promises to handle errors, including quota exceeded, invalid keys, or unavailable storage areas.
- **Event Handling:**  
  - The `"onChanged"` event fires for all storage areas. Use the `areaName` parameter in your handler to filter as needed.
- **Setup Requirements:**  
  - The Superpowers extension must be installed and active for these APIs to function.
- **Asynchronous Operations:**  
  - All storage methods are asynchronous and return Promises, even if the underlying Chrome API is callback-based.
- **Security:**  
  - Only the page context where the Superpowers extension is active can access this API. Data is not shared across origins unless explicitly stored in a shared storage area.

---

**Summary:**  
The `Superpowers.storage` API provides a modern, Promise-based, event-capable interface to Chrome extension storage from the page context, mirroring the structure and semantics of the native `chrome.storage` API, with robust error handling and event subscription support.

### gsc

Type: **Integration**

Purpose:  
The `gsc` plugin integrates Google Search Console (GSC) capabilities into web pages via the `window.Superpowers.Gsc` namespace. It provides a comprehensive, promise-based API for authentication, site management, search analytics, sitemaps, and URL inspection, all securely proxied through the Superpowers extension.

---

#### Public API

All methods are available under `window.Superpowers.Gsc`.  
**All methods return Promises** (except where noted), and should be used with `.then()`/`.catch()` or `async/await`.

---

##### Superpowers.Gsc.login(customCreds = {})

- **Purpose:**  
  Authenticates the user with Google Search Console using OAuth. Loads credentials and verifies access by performing a test API call.
- **Parameters:**
  - `customCreds` (Object, optional):  
    Custom credential options.  
    - `service` (string): Service key (default: `"google-searchconsole"`).
    - `clientSecretType` (string): Credential type (default: `"client_secret"`).
    - `tokenType` (string): Token type (default: `"token"`).
    - `customTokenKey` (string): Custom token key (optional).
- **Returns:**  
  `Promise<{ success: boolean, message: string }>`  
  Resolves if login is successful, rejects with an error otherwise.
- **Example:**
  ```javascript
  Superpowers.Gsc.login()
    .then(res => {
      console.log("Login successful:", res.message);
    })
    .catch(err => {
      console.error("Login failed:", err.message);
    });
  ```

---

##### Superpowers.Gsc.getLoginStatus()

- **Purpose:**  
  Returns the last known login status (true if authenticated, false otherwise).
- **Parameters:**  
  None
- **Returns:**  
  `Promise<boolean>`  
  Resolves to `true` if authenticated, `false` otherwise.
- **Example:**
  ```javascript
  Superpowers.Gsc.getLoginStatus()
    .then(isLoggedIn => {
      if (isLoggedIn) {
        console.log("User is authenticated with GSC.");
      } else {
        console.log("User is NOT authenticated.");
      }
    });
  ```

---

##### Superpowers.Gsc.test()

- **Purpose:**  
  Alias for `login({})`. Performs a login/authentication test.
- **Parameters:**  
  None
- **Returns:**  
  `Promise<{ success: boolean, message: string }>`
- **Example:**
  ```javascript
  Superpowers.Gsc.test()
    .then(res => console.log(res.message))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.listSites()

- **Purpose:**  
  Lists all sites verified in the user's Google Search Console account.
- **Parameters:**  
  None
- **Returns:**  
  `Promise<Object>`  
  Resolves to the GSC API response object containing the list of sites.
- **Example:**
  ```javascript
  Superpowers.Gsc.listSites()
    .then(sites => {
      console.log("Sites:", sites);
    })
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getSiteInfo(siteUrl)

- **Purpose:**  
  Retrieves information about a specific site. (Alias for `getSite`)
- **Parameters:**
  - `siteUrl` (string): The full site URL (e.g., `"https://example.com/"`).
- **Returns:**  
  `Promise<Object>`  
  Resolves to the site info object.
- **Example:**
  ```javascript
  Superpowers.Gsc.getSiteInfo("https://example.com/")
    .then(info => console.log(info))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.querySearchAnalytics(siteUrl, queryBody)

- **Purpose:**  
  Runs a custom search analytics query for a site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `queryBody` (Object): GSC API query body. Must include at least `startDate` and `endDate`. See [GSC API docs](https://developers.google.com/webmaster-tools/search-console-api-original/v3/searchanalytics/query) for structure.
- **Returns:**  
  `Promise<Object>`  
  Resolves to the analytics data.
- **Example:**
  ```javascript
  Superpowers.Gsc.querySearchAnalytics("https://example.com/", {
    startDate: "2024-05-01",
    endDate: "2024-05-31",
    dimensions: ["query"],
    rowLimit: 100
  })
    .then(data => console.log(data))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.submitSitemap(siteUrl, sitemapUrl)

- **Purpose:**  
  Submits a sitemap to Google Search Console for a given site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `sitemapUrl` (string): The full sitemap URL.
- **Returns:**  
  `Promise<Object>`  
  Resolves to the API response.
- **Example:**
  ```javascript
  Superpowers.Gsc.submitSitemap("https://example.com/", "https://example.com/sitemap.xml")
    .then(res => console.log("Sitemap submitted:", res))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.deleteSitemap(siteUrl, sitemapUrl)

- **Purpose:**  
  Deletes a sitemap from Google Search Console for a given site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `sitemapUrl` (string): The full sitemap URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.deleteSitemap("https://example.com/", "https://example.com/sitemap.xml")
    .then(res => console.log("Sitemap deleted:", res))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.listSitemaps(siteUrl)

- **Purpose:**  
  Lists all sitemaps for a given site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.listSitemaps("https://example.com/")
    .then(sitemaps => console.log(sitemaps))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.addSite(siteUrl)

- **Purpose:**  
  Adds a new site to Google Search Console.
- **Parameters:**
  - `siteUrl` (string): The site URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.addSite("https://example.com/")
    .then(res => console.log("Site added:", res))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.deleteSite(siteUrl)

- **Purpose:**  
  Removes a site from Google Search Console.
- **Parameters:**
  - `siteUrl` (string): The site URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.deleteSite("https://example.com/")
    .then(res => console.log("Site deleted:", res))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getSite(siteUrl)

- **Purpose:**  
  Retrieves information about a specific site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getSite("https://example.com/")
    .then(info => console.log(info))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getSitemap(siteUrl, sitemapUrl)

- **Purpose:**  
  Retrieves information about a specific sitemap.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `sitemapUrl` (string): The sitemap URL.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getSitemap("https://example.com/", "https://example.com/sitemap.xml")
    .then(info => console.log(info))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getTopQueries(siteUrl, options = {})

- **Purpose:**  
  Retrieves top search queries for a site.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `options` (Object, optional):  
    - `startDate`, `endDate` (string, YYYY-MM-DD): Date range.
    - `rowLimit` (number): Max rows (default: 100).
    - Other GSC query options.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getTopQueries("https://example.com/", { rowLimit: 50 })
    .then(data => console.log(data))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getTopPages(siteUrl, options = {})

- **Purpose:**  
  Retrieves top pages for a site.
- **Parameters:**  
  Same as `getTopQueries`.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getTopPages("https://example.com/", { rowLimit: 50 })
    .then(data => console.log(data))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getDetailedAnalytics(siteUrl, options = {})

- **Purpose:**  
  Retrieves detailed analytics with multiple dimensions (query, page, device, country).
- **Parameters:**  
  - `siteUrl` (string): The site URL.
  - `options` (Object, optional):  
    - `dimensions` (array): Dimensions to include (default: `["query", "page", "device", "country"]`).
    - `rowLimit` (number): Max rows (default: 1000).
    - Other GSC query options.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getDetailedAnalytics("https://example.com/", { rowLimit: 500 })
    .then(data => console.log(data))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getTopPagesDetailed(siteUrl, options = {})

- **Purpose:**  
  Retrieves detailed analytics for top pages, aggregated by page.
- **Parameters:**  
  Same as `getDetailedAnalytics`.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getTopPagesDetailed("https://example.com/", { rowLimit: 100 })
    .then(data => console.log(data))
    .catch(err => console.error(err));
  ```

---

##### Superpowers.Gsc.getQueryAnalyticsByPage(siteUrl, pageUrl, options = {})

- **Purpose:**  
  Retrieves query analytics for a specific page.
- **Parameters:**
  - `siteUrl` (string): The site URL.
  - `pageUrl` (string): The page URL.
  - `options` (Object, optional): Query options.
- **Returns:**  
  `Promise<Object>`
- **Example:**
  ```javascript
  Superpowers.Gsc.getQueryAnalyticsByPage("https://example.com/", "https://example.com/page.html")
   

### gemini

Type: **Integration**

Purpose:  
The Superpowers Gemini plugin integrates Google's Gemini family of generative AI models directly into web pages via the `window.Superpowers.Gemini` object. It provides secure, client-side JavaScript access to Gemini's advanced text, multimodal (image, video, audio, document), function calling, and related AI capabilities, without exposing your API key to the page.

---

#### Public API

##### `Superpowers.Gemini`

The `Superpowers.Gemini` object is a deep proxy to the [@google/genai](https://www.npmjs.com/package/@google/genai) SDK's `GoogleGenerativeAI` client. All public methods and properties of the Gemini SDK client are accessible via this object, most notably under the `models` namespace.

**Key Namespaces and Methods:**

- `Superpowers.Gemini.models.generateContent(options)`
- `Superpowers.Gemini.models.countTokens(options)`
- `Superpowers.Gemini.models.generateImages(options)` *(if supported by the Gemini API and SDK version)*
- `Superpowers.Gemini.models.generateVideos(options)` *(if supported by the Gemini API and SDK version)*

All methods return Promises and mirror the structure and semantics of the [@google/genai](https://ai.google.dev/gemini-api/docs/reference/rest/v1beta/models/generateContent) SDK.

---

##### `Superpowers.Gemini.models.generateContent(options)`

- **Purpose:**  
  Generates text or multimodal content using a specified Gemini model. Supports text, image, video, audio, PDF, and function calling, as well as advanced features like grounding, safety settings, and structured (JSON) output.

- **Parameters:**
  - `options` (Object):  
    - `model` (string): The Gemini model name (e.g., `"gemini-1.5-flash-latest"`, `"gemini-2.5-pro-preview-05-06"`).  
    - `contents` (Array): Array of message objects representing the conversation or prompt. Each object typically has:
      - `role` (string): `"user"`, `"model"`, `"function"`, etc.
      - `parts` (Array): Each part can be:
        - `{ text: string }`
        - `{ inlineData: { mimeType: string, data: string } }` (for base64-encoded images, audio, video, PDFs, etc.)
        - `{ functionCall: ... }` or `{ functionResponse: ... }` (for function calling)
    - `generationConfig` (Object, optional): Controls temperature, max tokens, response format, etc.
    - `tools` (Array, optional): For function calling or grounding (e.g., `[{ functionDeclarations: [...] }]`, `[{ googleSearchRetrieval: {} }]`).
    - `toolConfig` (Object, optional): Advanced tool configuration.
    - `safetySettings` (Array, optional): Content filtering settings.
    - Other Gemini SDK options as supported.

- **Returns:**  
  `Promise<Object>`  
  Resolves to the Gemini API response object, typically containing:
  - `candidates` (Array): Each candidate has `content`, `finishReason`, `safetyRatings`, etc.
  - `candidates[0].content.parts[0].text` (string): The generated text (for text responses).
  - For JSON mode: `candidates[0].content.parts[0].text` is a JSON string.
  - For function calling: `candidates[0].content.parts[0].functionCall` (object).
  - For grounding: `candidates[0].groundingMetadata` (object).

- **Example:**
```javascript
Superpowers.ready(async () => {
  try {
    const result = await Superpowers.Gemini.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: [
        { role: "user", parts: [{ text: "Summarize the attached PDF in three bullet points." },
                                { inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjcNCiW..." } }]
        }
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
    });
    const summary = result.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Gemini PDF Summary:", summary);
  } catch (error) {
    console.error("Error generating content:", error);
  }
});
```

---

##### `Superpowers.Gemini.models.countTokens(options)`

- **Purpose:**  
  Estimates the number of tokens in a given prompt for a specific Gemini model. Useful for managing context window limits.

- **Parameters:**
  - `options` (Object):
    - `model` (string): The Gemini model name.
    - `contents` (Array): Same structure as in `generateContent`.

- **Returns:**  
  `Promise<Object>`  
  Resolves to an object with at least:
  - `totalTokens` (number): The estimated token count.

- **Example:**
```javascript
Superpowers.ready(async () => {
  try {
    const result = await Superpowers.Gemini.models.countTokens({
      model: "gemini-1.5-flash-latest",
      contents: [{ role: "user", parts: [{ text: "How many tokens is this?" }] }]
    });
    console.log("Token count:", result.totalTokens);
  } catch (error) {
    console.error("Error counting tokens:", error);
  }
});
```

---

##### `Superpowers.Gemini.models.generateImages(options)` *(if supported)*

- **Purpose:**  
  Generates images from text prompts using Gemini-compatible image generation models (e.g., Imagen 3).

- **Parameters:**
  - `options` (Object):  
    - `model` (string): The image generation model name (e.g., `"imagen-3.0-generate-002"`).
    - `prompt` (string): The text prompt for image generation.
    - Other model-specific options.

- **Returns:**  
  `Promise<Object>`  
  Resolves to the Gemini API response for image generation.

- **Example:**
```javascript
Superpowers.ready(async () => {
  try {
    const result = await Superpowers.Gemini.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: "A futuristic cityscape at sunset, in the style of Syd Mead"
    });
    // result.images[0].data is a base64-encoded image
    console.log("Generated image (base64):", result.images?.[0]?.data);
  } catch (error) {
    console.error("Error generating image:", error);
  }
});
```

---

##### `Superpowers.Gemini.models.generateVideos(options)` *(if supported)*

- **Purpose:**  
  Generates videos from text or image prompts using Gemini-compatible video generation models (e.g., Veo 2).

- **Parameters:**
  - `options` (Object):  
    - `model` (string): The video generation model name (e.g., `"veo-2.0-generate-001"`).
    - `prompt` (string): The text prompt for video generation.
    - Other model-specific options.

- **Returns:**  
  `Promise<Object>`  
  Resolves to the Gemini API response for video generation.

- **Example:**
```javascript
Superpowers.ready(async () => {
  try {
    const result = await Superpowers.Gemini.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: "A time-lapse of a flower blooming"
    });
    // result.videos[0].data is a base64-encoded video
    console.log("Generated video (base64):", result.videos?.[0]?.data);
  } catch (error) {
    console.error("Error generating video:", error);
  }
});
```

---

#### Caveats & Edge Cases

- **API Key Requirement:**  
  You must set a valid `GEMINI_API_KEY` in the Superpowers extension's Environment Variable Manager. The plugin will throw an error if the key is missing or invalid.

- **Model Availability:**  
  Not all models or features may be available to your API key or region. Refer to [Google's model documentation](https://ai.google.dev/gemini-api/docs/models) for up-to-date information.

- **Token & Rate Limits:**  
  Each model has strict context window (token) and rate limits. Exceeding these will result in errors (e.g., 429).

- **Function Calling & Tools:**  
  For function calling, you must manage the function execution and conversation state on the client side. The plugin does not maintain chat or tool state for you.

- **Multimodal Inputs:**  
  For images, audio, video, and PDFs, you must provide base64-encoded data (without the data URL prefix) and specify the correct `mimeType`.

- **Grounding (Google Search):**  
  Grounding tools differ by model version (`googleSearchRetrieval` for Gemini 1.5, `googleSearch` for Gemini 2.0+).

- **Safety Settings:**  
  Content may be blocked or filtered based on your safety settings and the model's own policies. Always check `finishReason` and `safetyRatings` in the response.

- **No API Key Exposure:**  
  The API key is never exposed to your page's JavaScript; all requests are securely proxied through the extension.

- **Asynchronous API:**  
  All methods return Promises. Always use `await` or `.then/.catch` for error handling.

- **Superpowers Readiness:**  
  Always wait for `Superpowers.ready()` before making Gemini API calls.

- **SDK Version:**  
  The available methods and their signatures mirror the [@google/genai](https://www.npmjs.com/package/@google/genai) SDK version vendored by the extension. Refer to the [official SDK docs](https://ai.google.dev/gemini-api/docs/reference/rest/v1beta/models/generateContent) for the most accurate method signatures and options.

- **Extension Dependency:**  
  Requires the Superpowers Chrome extension to be installed and enabled on the page.

---

**For further details, see the [official Gemini API documentation](https://ai.google.dev/gemini-api/docs) and the [Superpowers Gemini Plugin README](#).**

### superasyncrandominteger
Type: Utility  
Purpose: Provides an asynchronous method to generate a cryptographically weak random integer within a specified range, after a configurable delay. Useful for simulating asynchronous operations or introducing controlled randomness in web applications.

---

#### Public API

##### Superpowers.asyncRandomInteger(timeMs, minVal, maxVal)
- Purpose:  
  Asynchronously generates a random integer between `minVal` and `maxVal` (inclusive) after waiting for `timeMs` milliseconds. This can be used to simulate delayed random responses or to introduce non-blocking randomness in application logic.
- Parameters:
  - `timeMs` (Number):  
    The delay in milliseconds before the random integer is generated and returned. Must be a non-negative integer. If set to 0, the result is returned as soon as possible (after the next event loop tick).
  - `minVal` (Number):  
    The minimum integer value (inclusive) that can be returned. Must be less than or equal to `maxVal`.
  - `maxVal` (Number):  
    The maximum integer value (inclusive) that can be returned. Must be greater than or equal to `minVal`.
- Returns:  
  `Promise<Number>` — Resolves with a random integer in the range `[minVal, maxVal]` (inclusive) after the specified delay.  
  The promise is rejected if an internal error occurs (e.g., communication failure with the extension), but not for invalid parameter values (no explicit validation is performed).
- Example:
```javascript
// Generate a random integer between 10 and 20, after a 500ms delay
Superpowers.asyncRandomInteger(500, 10, 20)
  .then(randomInt => {
    console.log("Random integer received:", randomInt);
    // Use the random integer in your application logic
  })
  .catch(error => {
    console.error("Failed to generate random integer:", error);
    // Handle errors (e.g., extension not available, communication failure)
  });
```

---

#### Event Listeners

This plugin does not expose any event listeners or subscription APIs. All interaction is via the `Superpowers.asyncRandomInteger` method, which returns a Promise.

---

#### Caveats & Edge Cases

- **Parameter Validation:**  
  The method does not perform explicit validation on input parameters. Supplying invalid values (e.g., `minVal > maxVal`, negative `timeMs`, non-integer values) may result in unexpected behavior or NaN results. It is the caller's responsibility to ensure valid arguments.
- **Randomness Quality:**  
  The random integer is generated using `Math.random()`, which is not cryptographically secure. Do not use this method for security-sensitive randomness.
- **Delay Accuracy:**  
  The delay (`timeMs`) is implemented using `setTimeout` and is subject to normal JavaScript timer limitations (e.g., timer clamping in inactive tabs).
- **Extension Dependency:**  
  This method requires the Superpowers Chrome extension (with the `superasyncrandominteger` plugin) to be installed and active. If the extension is not available or communication fails, the returned Promise will be rejected with an error message.
- **Concurrency:**  
  Multiple concurrent calls are supported; each call is independent and returns its own Promise.
- **No Cancellation:**  
  Once initiated, a call cannot be cancelled.

---

**Summary:**  
`Superpowers.asyncRandomInteger` is a simple, asynchronous utility for generating random integers with a configurable delay. It is best suited for simulating asynchronous operations or introducing non-blocking randomness in web applications, but should not be used for cryptographic purposes or where strong randomness is required. Always validate input parameters before calling.

### superdebug
Type: Utility  
Purpose: Provides enhanced, centralized debug logging for web pages, allowing developers to send structured logs from the page context to the Superpowers extension for advanced inspection and debugging. Logging can be enabled or disabled at runtime, and logs are forwarded to the extension's side panel for review.

#### Public API

##### Superpowers.debugLog(...args)
- Purpose:  
  Sends one or more values as a structured debug log entry to the Superpowers extension. When enabled, each call transmits the provided arguments (after safe serialization) along with a timestamp and the current page URL. Logs are viewable in the extension's side panel or console. Logging is a no-op unless explicitly enabled.
- Parameters:
  - `...args` (any): One or more values to log. Supports objects, arrays, primitives, errors, and functions. Circular references and unserializable values are handled gracefully (see Caveats).
- Returns:  
  `undefined` (fire-and-forget; does not return a value or Promise)
- Example:
```javascript
// Enable debug logging first
await Superpowers.debugLog.enable();

Superpowers.debugLog(
  "User clicked button",
  { id: 42, label: "Submit" },
  new Error("Test error"),
  () => "function example"
);

// Logging is silent if not enabled
Superpowers.debugLog("This will not be sent if logging is disabled.");
```

---

##### Superpowers.debugLog.enable()
- Purpose:  
  Enables debug logging for the current page context. After calling this method, all subsequent Superpowers.debugLog calls will be forwarded to the extension until disabled. Notifies the extension that logging is active for this page.
- Parameters:  
  None
- Returns:  
  `Promise<void>` — Resolves when logging is enabled and the extension has been notified. Rejects if the bridge communication fails.
- Example:
```javascript
Superpowers.debugLog.enable()
  .then(() => {
    console.log("Superpowers debug logging enabled.");
    Superpowers.debugLog("This log will be sent to the extension.");
  })
  .catch(error => {
    console.error("Failed to enable Superpowers debug logging:", error);
  });
```

---

##### Superpowers.debugLog.disable()
- Purpose:  
  Disables debug logging for the current page context. After calling this method, Superpowers.debugLog becomes a no-op until re-enabled. Notifies the extension that logging is no longer active for this page.
- Parameters:  
  None
- Returns:  
  `Promise<void>` — Resolves when logging is disabled and the extension has been notified. Rejects if the bridge communication fails.
- Example:
```javascript
Superpowers.debugLog.disable()
  .then(() => {
    console.log("Superpowers debug logging disabled.");
    Superpowers.debugLog("This log will NOT be sent to the extension.");
  })
  .catch(error => {
    console.error("Failed to disable Superpowers debug logging:", error);
  });
```

---

#### Caveats & Edge Cases

- **Logging is opt-in:**  
  Logging is disabled by default. You must call `Superpowers.debugLog.enable()` before any logs are sent. Calling `Superpowers.debugLog` while disabled does nothing.
- **Serialization:**  
  Arguments are serialized using `JSON.stringify` with a custom replacer to handle circular references and BigInts. Functions are logged as `"[Function]"`, errors as `"[Error: message]"`, and circular references as `"[Circular Reference]"`. Unserializable values fallback to their string representation.
- **Fire-and-forget:**  
  `Superpowers.debugLog` does not return a Promise and does not provide delivery confirmation. Logging failures (e.g., bridge errors) are reported to the original console as warnings or errors.
- **Enable/Disable are asynchronous:**  
  Both `enable()` and `disable()` return Promises and should be awaited for reliable state changes and error handling.
- **No log buffering:**  
  Logs are sent immediately; there is no local buffering or throttling.
- **No persistence:**  
  Logs are stored in memory by the extension and are not persisted across browser sessions.
- **Multiple tabs/contexts:**  
  Enabling or disabling logging affects only the current page context (tab/frame). Each context manages its own enabled/disabled state.
- **Dependencies:**  
  Requires the Superpowers Chrome extension with the "superdebug" plugin enabled. The global `window.Superpowers` object must be present (automatically injected by the extension).
- **No log retrieval API:**  
  There is no public API to retrieve or query past logs from the page context.

---

This API is designed for advanced debugging workflows where you want to capture structured logs from your application and inspect them centrally via the Superpowers extension, without polluting the standard browser console.

### superaction
Type: System  
Purpose: Provides a secure, promise-based bridge for web pages to interact with the Chrome Extension's `chrome.action` API via `window.Superpowers.action`. This enables advanced manipulation of the extension's toolbar icon, badge, title, popup, and related features directly from page scripts.

#### Public API

##### Superpowers.action.setIcon(details)
- Purpose: Sets the extension's toolbar icon for the current tab or globally.
- Parameters:
  - `details` (Object): An object specifying icon data. Must conform to the [chrome.action.setIcon](https://developer.chrome.com/docs/extensions/reference/api/action/#method-setIcon) API, e.g. `{ path: "icon.png" }` or `{ imageData: ImageData, tabId: 123 }`.
- Returns: `Promise<void>` — Resolves when the icon is set.
- Example:
```javascript
Superpowers.action.setIcon({ path: { "16": "icon16.png", "32": "icon32.png" } })
  .then(() => {
    console.log("Icon updated successfully.");
  })
  .catch(error => {
    console.error("Failed to set icon:", error);
  });
```

---

##### Superpowers.action.setTitle(details)
- Purpose: Sets the tooltip (title) for the extension's toolbar icon.
- Parameters:
  - `details` (Object): `{ title: string, tabId?: number }`. See [chrome.action.setTitle](https://developer.chrome.com/docs/extensions/reference/api/action/#method-setTitle).
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.setTitle({ title: "Superpowers is active!" })
  .then(() => {
    console.log("Title set.");
  })
  .catch(error => {
    console.error("Failed to set title:", error);
  });
```

---

##### Superpowers.action.setBadgeText(details)
- Purpose: Sets the badge text for the extension's icon.
- Parameters:
  - `details` (Object): `{ text: string, tabId?: number }`. See [chrome.action.setBadgeText](https://developer.chrome.com/docs/extensions/reference/api/action/#method-setBadgeText).
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.setBadgeText({ text: "99+" })
  .then(() => {
    console.log("Badge text set.");
  })
  .catch(error => {
    console.error("Failed to set badge text:", error);
  });
```

---

##### Superpowers.action.setBadgeBackgroundColor(details)
- Purpose: Sets the badge background color.
- Parameters:
  - `details` (Object): `{ color: string|Array<number>, tabId?: number }`. See [chrome.action.setBadgeBackgroundColor](https://developer.chrome.com/docs/extensions/reference/api/action/#method-setBadgeBackgroundColor).
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.setBadgeBackgroundColor({ color: "#FF0000" })
  .then(() => {
    console.log("Badge background color set.");
  })
  .catch(error => {
    console.error("Failed to set badge background color:", error);
  });
```

---

##### Superpowers.action.enable(tabId?)
- Purpose: Enables the extension's action (toolbar button) for a specific tab or globally.
- Parameters:
  - `tabId` (number, optional): The tab ID to enable the action for. If omitted, enables globally.
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.enable()
  .then(() => {
    console.log("Action enabled globally.");
  })
  .catch(error => {
    console.error("Failed to enable action:", error);
  });
```

---

##### Superpowers.action.disable(tabId?)
- Purpose: Disables the extension's action (toolbar button) for a specific tab or globally.
- Parameters:
  - `tabId` (number, optional): The tab ID to disable the action for. If omitted, disables globally.
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.disable()
  .then(() => {
    console.log("Action disabled globally.");
  })
  .catch(error => {
    console.error("Failed to disable action:", error);
  });
```

---

##### Superpowers.action.getBadgeText(details)
- Purpose: Retrieves the badge text for the extension's icon.
- Parameters:
  - `details` (Object): `{ tabId?: number }`. See [chrome.action.getBadgeText](https://developer.chrome.com/docs/extensions/reference/api/action/#method-getBadgeText).
- Returns: `Promise<string>` — Resolves with the badge text.
- Example:
```javascript
Superpowers.action.getBadgeText({})
  .then(text => {
    console.log("Current badge text:", text);
  })
  .catch(error => {
    console.error("Failed to get badge text:", error);
  });
```

---

##### Superpowers.action.getBadgeBackgroundColor(details)
- Purpose: Retrieves the badge background color.
- Parameters:
  - `details` (Object): `{ tabId?: number }`. See [chrome.action.getBadgeBackgroundColor](https://developer.chrome.com/docs/extensions/reference/api/action/#method-getBadgeBackgroundColor).
- Returns: `Promise<Array<number>>` — Resolves with an RGBA array.
- Example:
```javascript
Superpowers.action.getBadgeBackgroundColor({})
  .then(color => {
    console.log("Badge background color:", color);
  })
  .catch(error => {
    console.error("Failed to get badge background color:", error);
  });
```

---

##### Superpowers.action.getTitle(details)
- Purpose: Retrieves the tooltip (title) for the extension's toolbar icon.
- Parameters:
  - `details` (Object): `{ tabId?: number }`. See [chrome.action.getTitle](https://developer.chrome.com/docs/extensions/reference/api/action/#method-getTitle).
- Returns: `Promise<string>` — Resolves with the title string.
- Example:
```javascript
Superpowers.action.getTitle({})
  .then(title => {
    console.log("Current title:", title);
  })
  .catch(error => {
    console.error("Failed to get title:", error);
  });
```

---

##### Superpowers.action.getPopup(details)
- Purpose: Retrieves the popup URL for the extension's action.
- Parameters:
  - `details` (Object): `{ tabId?: number }`. See [chrome.action.getPopup](https://developer.chrome.com/docs/extensions/reference/api/action/#method-getPopup).
- Returns: `Promise<string>` — Resolves with the popup URL.
- Example:
```javascript
Superpowers.action.getPopup({})
  .then(popupUrl => {
    console.log("Popup URL:", popupUrl);
  })
  .catch(error => {
    console.error("Failed to get popup URL:", error);
  });
```

---

##### Superpowers.action.getUserSettings()
- Purpose: Retrieves user settings related to the extension's action.
- Parameters: None
- Returns: `Promise<Object>` — Resolves with a settings object as defined by [chrome.action.getUserSettings](https://developer.chrome.com/docs/extensions/reference/api/action/#method-getUserSettings).
- Example:
```javascript
Superpowers.action.getUserSettings()
  .then(settings => {
    console.log("User settings:", settings);
  })
  .catch(error => {
    console.error("Failed to get user settings:", error);
  });
```

---

##### Superpowers.action.openPopup(details)
- Purpose: Opens the extension's popup for a specific tab.
- Parameters:
  - `details` (Object): `{ tabId?: number }`. See [chrome.action.openPopup](https://developer.chrome.com/docs/extensions/reference/api/action/#method-openPopup).
- Returns: `Promise<void>`
- Example:
```javascript
Superpowers.action.openPopup({})
  .then(() => {
    console.log("Popup opened.");
  })
  .catch(error => {
    console.error("Failed to open popup:", error);
  });
```

---

#### Caveats & Edge Cases

- **Permissions:** All methods require the Superpowers extension to have the appropriate permissions (e.g., `"action"` in the manifest).
- **Tab Context:** For methods that accept a `tabId`, omitting it applies the action globally or to the current tab, depending on Chrome's API behavior.
- **Error Handling:** All methods return Promises and will reject with an `Error` if the underlying Chrome API call fails (e.g., due to invalid parameters, missing permissions, or unsupported method names).
- **API Version:** The bridge supports both callback-based and Promise-based Chrome APIs, but always exposes a Promise interface to page scripts.
- **Method Validation:** Only the following methods are supported: `setIcon`, `setTitle`, `setBadgeText`, `setBadgeBackgroundColor`, `enable`, `disable`, `getBadgeText`, `getBadgeBackgroundColor`, `getTitle`, `getPopup`, `getUserSettings`, `openPopup`. Attempts to call other methods will result in a rejected Promise.
- **No Event Subscription:** While the extension listens for `chrome.action.onClicked` internally, this event is not exposed to page scripts via `window.Superpowers.action`. Event subscription is not currently supported.
- **No Internal State:** The bridge does not maintain any state; it is a direct proxy to the Chrome API.
- **Required Setup:** The Superpowers extension must be installed and active. No additional setup is required on the page beyond accessing `window.Superpowers.action`.

---

**Best Practice:**  
Always handle Promise rejections to ensure robust error handling in your integrations. Validate your parameter objects against the [Chrome Action API documentation](https://developer.chrome.com/docs/extensions/reference/api/action/) for compatibility.

### superconsoleintercept
Type: Utility  
Purpose: Enables interception and broadcasting of `console` log events across browser contexts (tabs, extension, etc.) via the Superpowers extension. Allows developers to programmatically control console interception, transmission, and to subscribe to cross-context console events.

---

#### Public API

##### Superpowers.console.on(callback)
- Purpose: Registers a listener for cross-context console events (`CONSOLE_EVENT`). When any participating tab or context logs via `console.log`, `console.info`, `console.warn`, or `console.error` (while interception is enabled), the callback is invoked with the event details.
- Parameters:
  - `callback` (Function): Function to invoke when a console event is received. Receives a single argument:  
    - `event` (Object):  
      - `level` (String): The console method used (`'log'`, `'info'`, `'warn'`, `'error'`)
      - `args` (Array): The arguments originally passed to the console method
      - `sourceTabId` (Number|undefined): The originating tab's ID (if available)
- Returns: `void`
- Example:
```javascript
function handleConsoleEvent(event) {
  console.log(`[Remote Console][${event.level}]`, ...event.args);
  // Optionally, filter or process events by sourceTabId
}
Superpowers.console.on(handleConsoleEvent);
```

---

##### Superpowers.console.off(callback)
- Purpose: Unregisters a previously registered console event listener.
- Parameters:
  - `callback` (Function): The same function reference previously passed to `.on()`.
- Returns: `void`
- Example:
```javascript
Superpowers.console.off(handleConsoleEvent);
```

---

##### Superpowers.console.onAll(callback)
- Purpose: Alias for `.on(callback)`. Registers the callback for all `CONSOLE_EVENT` events.
- Parameters:
  - `callback` (Function): See `.on()` above.
- Returns: `void`
- Example:
```javascript
Superpowers.console.onAll(handleConsoleEvent);
```

---

##### Superpowers.console.turnOn()
- Purpose: Enables interception of `console.log`, `console.info`, `console.warn`, and `console.error` in the current page. All subsequent calls to these methods are broadcast to other participating contexts (tabs, extension, etc.) via the Superpowers bridge, and also still invoke the original console behavior locally.
- Parameters: None
- Returns: `Promise<void>` — Resolves when interception is enabled; rejects if enabling fails.
- Example:
```javascript
Superpowers.console.turnOn()
  .then(() => {
    console.log("Superpowers console interception enabled.");
  })
  .catch(err => {
    console.error("Failed to enable interception:", err);
  });
```

---

##### Superpowers.console.turnOff()
- Purpose: Disables interception of console methods in the current page. Restores the original console methods and stops broadcasting log events.
- Parameters: None
- Returns: `Promise<void>` — Resolves when interception is disabled; rejects if disabling fails.
- Example:
```javascript
Superpowers.console.turnOff()
  .then(() => {
    console.log("Superpowers console interception disabled.");
  })
  .catch(err => {
    console.error("Failed to disable interception:", err);
  });
```

---

##### Superpowers.console.turnTransmissionOn()
- Purpose: Locally enables transmission of intercepted console events from this page to the Superpowers bridge. Has no effect if interception is not enabled. This is a local toggle and does not affect other tabs or the extension.
- Parameters: None
- Returns: `void`
- Example:
```javascript
Superpowers.console.turnTransmissionOn();
console.log("Transmission is now ON.");
```

---

##### Superpowers.console.turnTransmissionOff()
- Purpose: Locally disables transmission of intercepted console events from this page to the Superpowers bridge. Console methods are still overridden (if interception is enabled), but log events are not sent to other contexts.
- Parameters: None
- Returns: `void`
- Example:
```javascript
Superpowers.console.turnTransmissionOff();
console.log("Transmission is now OFF (this log will not be broadcast).");
```

---

#### Event Listeners

- **CONSOLE_EVENT**:  
  All registered callbacks via `.on()`/`.onAll()` receive an event object whenever a console log event is broadcast from any participating context.  
  Event object structure:
  ```javascript
  {
    level: 'log' | 'info' | 'warn' | 'error',
    args: Array,           // Arguments originally passed to the console method
    sourceTabId: Number    // (optional) Tab ID of the source, if available
  }
  ```

---

#### Caveats & Edge Cases

- **Interception Scope**: Only `console.log`, `console.info`, `console.warn`, and `console.error` are intercepted and broadcast. Other console methods (e.g., `console.debug`, `console.trace`) are unaffected.
- **Broadcasting Control**:  
  - Calling `.turnOn()` enables interception and requests the extension to start broadcasting events from this page.  
  - If the extension disables broadcasting (e.g., via `.turnOff()` in all tabs), no events will be broadcast, even if interception is enabled locally.
- **Transmission Toggle**:  
  - `.turnTransmissionOn()` and `.turnTransmissionOff()` only affect the current page's transmission of events. They do not affect interception or event reception.
- **Multiple Listeners**:  
  - You may register multiple callbacks via `.on()`/`.onAll()`. Each must be removed individually via `.off()`.
- **Original Console Access**:  
  - The original console methods are preserved in `window._originalConsole` for emergency recovery, but this is not part of the public API.
- **Error Handling**:  
  - `.turnOn()` and `.turnOff()` return Promises and should be handled accordingly.
- **Dependencies**:  
  - Requires the Superpowers Chrome extension to be installed and active.
  - The `window.Superpowers.console` API is only available after the extension injects its scripts.

---

**Best Practices:**
- Always use `.turnOn()` and `.turnOff()` to manage interception state.
- Use `.on()`/`.off()` to manage event listeners and avoid memory leaks.
- Handle Promise rejections from `.turnOn()`/`.turnOff()` for robust error handling.
- Use transmission toggles for fine-grained control over which pages broadcast events.

---

**Example: Full Usage**
```javascript
// Enable interception and listen for all remote console events
Superpowers.console.turnOn()
  .then(() => {
    Superpowers.console.on(event => {
      // Display all remote logs in a custom UI
      myCustomLogViewer.add(`[${event.level}]`, ...event.args);
    });
  })
  .catch(err => {
    alert("Could not enable Superpowers console interception: " + err);
  });

// Later, to stop interception and remove listeners:
Superpowers.console.off(myCustomLogViewer.add);
Superpowers.console.turnOff();
```


### superdebugger
Type: Utility  
Purpose: Provides a secure, promise-based bridge to the Chrome `chrome.debugger` API from web pages, enabling advanced debugging automation and protocol-level control over browser tabs via `window.Superpowers.debugger`. This allows developers to attach to tabs, send protocol commands, and listen for debugger events directly from page scripts, subject to extension permissions.

---

#### Public API

##### Superpowers.debugger.attach(target, requiredVersion)
- Purpose:  
  Attaches the Chrome debugger to a specified debuggee target (typically a tab), enabling protocol-level debugging operations. Use this before sending any debugger commands to a target.
- Parameters:
  - `target` (Object): The debuggee descriptor. Must contain at least one of the following properties:
    - `tabId` (number): The ID of the tab to debug.
    - `extensionId` (string): The ID of the extension to debug.
    - `targetId` (string): The opaque target ID (for advanced use).
    - At least one property is required.
  - `requiredVersion` (string): The required protocol version (e.g., `"1.3"`). Must be a non-empty string.
- Returns:  
  `Promise<void>` — Resolves when the debugger is successfully attached. Rejects with an `Error` if the target is invalid, the version is missing, or the attach operation fails.
- Example:
```javascript
const target = { tabId: 123 };
Superpowers.debugger.attach(target, '1.3')
  .then(() => {
    console.log('Debugger attached to tab 123');
    // Now you can send protocol commands to this tab
  })
  .catch(err => {
    console.error('Failed to attach debugger:', err);
    // Handle permission errors, invalid target, or already-attached state
  });
```

---

##### Superpowers.debugger.detach(target)
- Purpose:  
  Detaches the Chrome debugger from the specified debuggee target, releasing protocol control and cleaning up any associated resources.
- Parameters:
  - `target` (Object): The debuggee descriptor. Must contain at least one of `tabId`, `extensionId`, or `targetId` (see above).
- Returns:  
  `Promise<void>` — Resolves when the debugger is successfully detached. Rejects with an `Error` if the target is invalid or the detach operation fails.
- Example:
```javascript
const target = { tabId: 123 };
Superpowers.debugger.detach(target)
  .then(() => {
    console.log('Debugger detached from tab 123');
  })
  .catch(err => {
    console.error('Failed to detach debugger:', err);
    // Handle errors such as not being attached
  });
```

---

##### Superpowers.debugger.sendCommand(target, method, commandParams)
- Purpose:  
  Sends a Chrome DevTools Protocol command to the specified debuggee target. Use this to interact with the debugging protocol (e.g., enable domains, set breakpoints, evaluate scripts).
- Parameters:
  - `target` (Object): The debuggee descriptor. Must contain at least one of `tabId`, `extensionId`, or `targetId`.
  - `method` (string): The protocol method name (e.g., `"Debugger.enable"`, `"Runtime.evaluate"`). Must be a non-empty string.
  - `commandParams` (Object, optional): Parameters for the protocol command, as specified by the DevTools Protocol. May be omitted or `undefined` if the command takes no parameters.
- Returns:  
  `Promise<Object|undefined>` — Resolves with the protocol response object (structure depends on the command), or `undefined` if the command has no result. Rejects with an `Error` if the target or method is invalid, or if the command fails.
- Example:
```javascript
const target = { tabId: 123 };
Superpowers.debugger.sendCommand(target, 'Runtime.evaluate', { expression: '2 + 2' })
  .then(result => {
    console.log('Evaluation result:', result);
    // result.result.value === 4
  })
  .catch(err => {
    console.error('Failed to send command:', err);
    // Handle protocol errors, invalid command, etc.
  });
```

---

##### Superpowers.debugger.on(eventName, callback)
- Purpose:  
  Subscribes to Chrome debugger events for all attached targets. Use this to receive protocol events (e.g., script parsed, breakpoint hit) or detach notifications.
- Parameters:
  - `eventName` (`'onEvent' | 'onDetach'`): The event type to listen for.
    - `'onEvent'`: Fired for all protocol events (e.g., `"Debugger.paused"`, `"Network.requestWillBeSent"`).
    - `'onDetach'`: Fired when the debugger is detached from a target.
  - `callback` (Function): The function to invoke when the event occurs. Signature depends on the event:
    - For `'onEvent'`: `callback(source, method, params)`
      - `source` (Object): The debuggee descriptor (e.g., `{ tabId: 123 }`).
      - `method` (string): The protocol event name.
      - `params` (Object): Event-specific parameters.
    - For `'onDetach'`: `callback(source, reason)`
      - `source` (Object): The debuggee descriptor.
      - `reason` (string): The reason for detachment.
- Returns:  
  `void`
- Example:
```javascript
// Listen for all debugger protocol events
Superpowers.debugger.on('onEvent', (source, method, params) => {
  console.log('Debugger event:', method, params, 'from', source);
  if (method === 'Debugger.paused') {
    // Handle pause event
  }
});

// Listen for detach events
Superpowers.debugger.on('onDetach', (source, reason) => {
  console.warn('Debugger detached from', source, 'Reason:', reason);
});
```

---

##### Superpowers.debugger.off(eventName, callback)
- Purpose:  
  Unsubscribes a previously registered event listener for debugger events.
- Parameters:
  - `eventName` (`'onEvent' | 'onDetach'`): The event type to unsubscribe from.
  - `callback` (Function): The callback function to remove (must be the same reference as passed to `.on`).
- Returns:  
  `void`
- Example:
```javascript
function onPaused(source, method, params) {
  if (method === 'Debugger.paused') {
    // ...
  }
}
Superpowers.debugger.on('onEvent', onPaused);
// Later, to remove:
Superpowers.debugger.off('onEvent', onPaused);
```

---

#### Event Listeners

- **on('onEvent', callback)**  
  Receives all protocol events from attached targets.  
  Callback signature: `(source, method, params)`

- **on('onDetach', callback)**  
  Notified when the debugger detaches from a target.  
  Callback signature: `(source, reason)`

- **off(eventName, callback)**  
  Removes the specified event listener.

---

#### Caveats & Edge Cases

- **Permissions Required:**  
  The extension must have the `"debugger"` permission. If not granted, all methods will fail with a permission error.
- **Target Validation:**  
  All methods require a valid `target` object with at least one of `tabId`, `extensionId`, or `targetId`. Invalid targets will cause immediate rejection.
- **Attach/Detach State:**  
  - Attaching to a tab that is already being debugged will fail.
  - Detaching from a tab that is not being debugged will fail.
  - Only one debugger client can be attached to a tab at a time.
- **Error Handling:**  
  All methods return Promises and reject with descriptive `Error` objects on failure. Always use `.catch()` or `try/catch` with `await`.
- **Event Listener Management:**  
  - Callbacks must be the same reference for `.off()` to work.
  - Only `'onEvent'` and `'onDetach'` are valid event names.
- **Multiple Attachments:**  
  The extension tracks active debug sessions per tab. Attempting to attach multiple times to the same tab from the same extension will fail.
- **API Availability:**  
  If the Chrome `chrome.debugger` API is unavailable (e.g., not in Chrome, or missing permissions), all methods will reject.
- **No Direct Access to chrome.debugger:**  
  The API is a bridge; you do not get direct access to the `chrome.debugger` object or its event emitters.
- **Setup:**  
  No manual setup is required beyond installing the Superpowers extension and ensuring the `"debugger"` permission is granted.

---

**Note:**  
This API is intended for advanced use cases such as protocol-level automation, custom debugging tools, or browser instrumentation. Misuse can disrupt normal tab operation. Always detach when finished.

### superfetch
Type: Utility  
Purpose:  
Provides a cross-origin, extension-powered fetch API for web pages, enabling advanced HTTP(S) requests (including those blocked by CORS) via the Superpowers Chrome extension. Also exposes methods for configuring fetch timeouts and monitoring active requests.

---

#### Public API

##### Superpowers.fetch(url, options)
- Purpose:  
  Performs an HTTP(S) request using the Chrome extension's background context, bypassing page-level CORS restrictions. Returns a Response-like object with methods for reading the response body as text, JSON, ArrayBuffer, or Blob.
- Parameters:
  - `url` (string):  
    The absolute URL to fetch. Must be a valid HTTP or HTTPS URL. Required.
  - `options` (object, optional):  
    Fetch options, similar to the standard [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/fetch). Supported properties include:
    - `method` (string): HTTP method (e.g., "GET", "POST"). Defaults to "GET".
    - `headers` (object): Key-value pairs of request headers.
    - `body` (string|FormData|Blob|ArrayBuffer): Request body for POST/PUT/PATCH.
    - `redirect` (string): "follow", "manual", or "error". Defaults to "follow".
    - `mode` (string): "cors" or "no-cors". Defaults to "cors".
    - `credentials` (string): "omit", "same-origin", or "include". Defaults to "same-origin".
    - `cache` (string): Cache mode (e.g., "default", "no-store").
    - `referrerPolicy` (string): Referrer policy.
    - `referrer`, `integrity`, `keepalive`: Advanced fetch options.
- Returns:  
  `Promise<SuperfetchResponse>`  
  Resolves to a Response-like object with the following properties and methods:
  - `status` (number): HTTP status code.
  - `statusText` (string): HTTP status text.
  - `ok` (boolean): True if status is in the 200–299 range.
  - `redirected` (boolean): True if the response was the result of a redirect.
  - `url` (string): Final response URL.
  - `type` (string): Response type ("basic", "cors", etc.).
  - `headers` (SuperfetchHeaders): Read-only headers object with `.get()`, `.has()`, `.forEach()`, etc.
  - `arrayBuffer()`: Returns a Promise resolving to an ArrayBuffer of the response body.
  - `text()`: Returns a Promise resolving to the response body as a string.
  - `json()`: Returns a Promise resolving to the parsed JSON object.
  - `blob()`: Returns a Promise resolving to a Blob of the response body.
  - (Internal) `_superfetch`: Debug info (requestId, timestamp, rawHeaders).
  - **Note:** The response body can only be read once (like the standard Fetch API).
- Example:
```javascript
Superpowers.fetch('https://httpbin.org/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ foo: 'bar' }),
  credentials: 'include'
})
  .then(async response => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    console.log("Received JSON:", data);
    // Access headers
    console.log("Server:", response.headers.get('server'));
  })
  .catch(error => {
    console.error("Superfetch error:", error);
  });
```

---

##### Superpowers.setSuperfetchTimeout(ms)
- Purpose:  
  Sets the desired timeout (in milliseconds) for the underlying fetch operation performed by the extension. This value is stored locally in the page context and does **not** currently affect the actual timeout enforced by the extension (see Caveats).
- Parameters:
  - `ms` (number):  
    Timeout in milliseconds. Must be a positive number.
- Returns:  
  `void`
- Example:
```javascript
Superpowers.setSuperfetchTimeout(60000); // Set fetch timeout to 60 seconds
```

---

##### Superpowers.getSuperfetchTimeout()
- Purpose:  
  Retrieves the current fetch timeout value (in milliseconds) as configured via `setSuperfetchTimeout`.
- Parameters:  
  None
- Returns:  
  `number` — The currently configured fetch timeout in milliseconds.
- Example:
```javascript
const timeout = Superpowers.getSuperfetchTimeout();
console.log(`Current superfetch timeout: ${timeout}ms`);
```

---

##### Superpowers.whatsGoingOn()
- Purpose:  
  Returns an array of currently active (pending) superfetch requests initiated from the page. Useful for debugging or monitoring outstanding requests.
- Parameters:  
  None
- Returns:  
  `Array<object>` — Each object represents a pending request with properties:
    - `requestId` (string): Unique identifier for the request.
    - `url` (string): The requested URL.
    - `startTime` (number): Timestamp (ms since epoch) when the request was initiated.
    - `options` (object): The options object passed to `fetch`.
    - (Internal) `timeoutId`, `resolve`, `reject`: Internal fields for request management.
- Example:
```javascript
const pending = Superpowers.whatsGoingOn();
console.log("Active superfetch requests:", pending);
```

---

#### Event Listeners

This plugin does **not** expose any event listeners or subscription APIs directly. All communication is handled via Promises returned by `Superpowers.fetch`.

---

#### Caveats & Edge Cases

- **CORS Bypass:**  
  Requests are performed in the extension's background context, bypassing normal page CORS restrictions. However, some endpoints may still block requests based on user agent, referer, or other headers.
- **Timeouts:**  
  - The timeout set via `setSuperfetchTimeout` is **local to the page** and does **not** currently affect the actual fetch timeout enforced by the extension (which defaults to 120,000 ms / 2 minutes).
  - The message roundtrip (page <-> extension) has a hardcoded timeout of 30,000 ms (30 seconds). If the extension does not respond in time, the Promise will reject.
- **Response Body Consumption:**  
  The response body can only be read **once** (as per the Fetch API). Subsequent calls to `.text()`, `.json()`, `.arrayBuffer()`, or `.blob()` will reject with a `TypeError`.
- **Headers:**  
  The `headers` property is a read-only object with `.get()`, `.has()`, `.forEach()`, etc., but is not a true `Headers` instance. Header names are always lowercased.
- **Request Options:**  
  Not all Fetch API options are supported or meaningful in the extension context. Unsupported options are ignored.
- **Dependencies:**  
  Requires the Superpowers Chrome extension to be installed and active. The `window.Superpowers` object is injected by the extension.
- **Error Handling:**  
  Network errors, timeouts, and HTTP errors (non-2xx) are surfaced via rejected Promises or non-`ok` responses. Always use `.catch()` and check `response.ok`.
- **No Streaming:**  
  The response body is buffered in full before being returned; streaming is not supported.
- **No Event Subscription:**  
  There are no hooks for progress, upload, or download events.

---

**Summary:**  
The `superfetch` plugin provides a robust, Promise-based, cross-origin fetch API for Chrome extension-powered web pages, with additional methods for timeout configuration and request monitoring. Use it as a drop-in replacement for fetch when you need to bypass CORS or require extension-level HTTP(S) access.

### superenv

Type: Utility  
Purpose:  
The `superenv` plugin provides a robust, namespaced API for managing environment variables and multiple named environment sets in the browser, backed by extension storage. It enables secure, persistent storage and retrieval of environment variables (such as API keys) for use in web applications, with support for multiple named sets and variable descriptions.

---

#### Public API

All primary methods are exposed under `window.Superpowers.Env`.  
Legacy methods are also available directly on `window.Superpowers` for backward compatibility, but are deprecated and emit warnings.

---

##### Superpowers.Env.getEnvVars()

- Purpose:  
  Retrieves the current environment variables from extension storage. If the extension is unavailable or storage fails, returns the last successfully cached values for robustness.
- Parameters:  
  - _None_
- Returns:  
  `Promise<Object>` — Resolves to an object mapping variable names to their values (e.g., `{ OPENAI_API_KEY: "sk-..." }`). If storage is unavailable, returns the last cached values (may be empty).
- Example:
```javascript
Superpowers.Env.getEnvVars()
  .then(envVars => {
    if ('OPENAI_API_KEY' in envVars) {
      // Use the API key securely
      fetch('https://api.openai.com/v1/endpoint', {
        headers: { 'Authorization': `Bearer ${envVars.OPENAI_API_KEY}` }
      });
    } else {
      console.warn("OPENAI_API_KEY not set in environment.");
    }
  })
  .catch(error => {
    // This block is rarely reached; method returns cached values on error
    console.error("Failed to load environment variables:", error);
  });
```

---

##### Superpowers.Env.getCachedEnvVars()

- Purpose:  
  Returns the most recently cached environment variables synchronously, without querying extension storage. Useful as a fallback or for performance-sensitive code.
- Parameters:  
  - _None_
- Returns:  
  `Object` — The last cached environment variables object (may be empty if never loaded).
- Example:
```javascript
const cachedVars = Superpowers.Env.getCachedEnvVars();
if (cachedVars.OPENAI_API_KEY) {
  // Use cached value
}
```

---

##### Superpowers.Env.proposeVars(payload)

- Purpose:  
  Proposes a new environment variable to be tracked, optionally with a description. If the variable does not exist, it is created with an empty string value. The description is stored or updated.
- Parameters:  
  - `payload` (Object):  
    - `name` (string, required): The variable name to propose (e.g., `"OPENAI_API_KEY"`).  
    - `description` (string, optional): Human-readable description of the variable's purpose.
- Returns:  
  `Promise<Object>` — Resolves to `{ proposed: string }` indicating the variable name that was proposed.
- Example:
```javascript
Superpowers.Env.proposeVars({
  name: "MY_SECRET_TOKEN",
  description: "Token for accessing the internal API"
})
  .then(result => {
    console.log("Proposed variable:", result.proposed);
  })
  .catch(error => {
    console.error("Failed to propose variable:", error);
  });
```

---

##### Superpowers.Env.listEnvSets()

- Purpose:  
  Lists all named environment sets and their contents, including the default set and variable descriptions.
- Parameters:  
  - _None_
- Returns:  
  `Promise<Object>` — Resolves to an object with the following structure:
  ```js
  {
    default: { VAR1: "value1", ... },
    descriptions: { VAR1: "desc", ... },
    [otherSetName]: { ... }
  }
  ```
- Example:
```javascript
Superpowers.Env.listEnvSets()
  .then(envSets => {
    console.log("Default set:", envSets.default);
    console.log("Descriptions:", envSets.descriptions);
    Object.keys(envSets).forEach(setName => {
      if (setName !== "default" && setName !== "descriptions") {
        console.log(`Set "${setName}":`, envSets[setName]);
      }
    });
  })
  .catch(error => {
    console.error("Failed to list environment sets:", error);
  });
```

---

##### Superpowers.Env.getEnvSet(setName)

- Purpose:  
  Retrieves the environment variables for a specific named set. If no name is provided, returns the default set.
- Parameters:  
  - `setName` (string, optional): The name of the environment set to retrieve. Defaults to `"default"` if omitted.
- Returns:  
  `Promise<Object>` — Resolves to an object mapping variable names to values for the specified set (empty object if the set does not exist).
- Example:
```javascript
Superpowers.Env.getEnvSet("staging")
  .then(vars => {
    console.log("Staging environment variables:", vars);
  })
  .catch(error => {
    console.error("Failed to get environment set:", error);
  });
```

---

##### Superpowers.Env.setEnvSet(setName, varsObject)

- Purpose:  
  Sets or replaces the variables for a specific named environment set. Overwrites any existing values for that set.
- Parameters:  
  - `setName` (string, optional): The name of the environment set to update. Defaults to `"default"` if omitted.
  - `varsObject` (Object): An object mapping variable names to their values.
- Returns:  
  `Promise<Object>` — Resolves to the updated environment set object.
- Example:
```javascript
Superpowers.Env.setEnvSet("production", {
  API_URL: "https://api.example.com",
  API_KEY: "prod-123"
})
  .then(updatedSet => {
    console.log("Production set updated:", updatedSet);
  })
  .catch(error => {
    console.error("Failed to set environment set:", error);
  });
```

---

##### Superpowers.Env.deleteEnvSet(setName)

- Purpose:  
  Deletes a named environment set. The `"default"` set cannot be deleted.
- Parameters:  
  - `setName` (string, required): The name of the environment set to delete. Must not be `"default"`.
- Returns:  
  `Promise<Object>` — Resolves to an empty object `{}` on success.
- Example:
```javascript
Superpowers.Env.deleteEnvSet("staging")
  .then(() => {
    console.log("Staging environment set deleted.");
  })
  .catch(error => {
    console.error("Failed to delete environment set:", error);
  });
```

---

##### Deprecated Methods

The following methods are available directly on `window.Superpowers` for backward compatibility, but are deprecated and emit warnings. Use the `Superpowers.Env` namespace instead.

- `Superpowers.getEnvVars()`
- `Superpowers.proposeVars(payload)`
- `Superpowers.listEnvSets()`
- `Superpowers.getEnvSet(setName)`
- `Superpowers.setEnvSet(setName, varsObject)`
- `Superpowers.deleteEnvSet(setName)`
- `Superpowers.setEnvVars(newVarsObject)` — **Deprecated and non-functional**; always returns `{ success: false, error: "Deprecated method" }`.

---

#### Caveats & Edge Cases

- **Extension Required:**  
  All methods (except `getCachedEnvVars`) require the Superpowers extension to be installed and active. If the extension is unavailable, `getEnvVars()` returns cached values; other methods may fail.
- **Caching:**  
  `getEnvVars()` is robust: on storage failure, it returns the last successfully fetched values. Use `getCachedEnvVars()` for synchronous access to these cached values.
- **Default Set Protection:**  
  The `"default"` environment set cannot be deleted. Attempting to do so will result in an error.
- **Descriptions:**  
  Variable descriptions are stored in a dedicated `descriptions` object within the environment sets structure.
- **Atomicity:**  
  All set/update operations replace the entire set object for the given name.
- **No Direct Variable Deletion:**  
  To remove a variable from a set, update the set with a new object omitting that variable.
- **Deprecated Methods:**  
  `Superpowers.setEnvVars()` is deprecated and does not update storage. Use the extension UI or `setEnvSet()` instead.
- **Initial Cache:**  
  The cache is populated on first use of `getEnvVars()`. Until then, `getCachedEnvVars()` returns an empty object.

---

**Required Setup:**  
No explicit setup is required beyond installing the Superpowers extension and enabling the `superenv` plugin.  
For best results, always use the `Superpowers.Env` namespace.

---

**Summary:**  
The `superenv` plugin offers a robust, extensible, and developer-friendly API for managing environment variables in browser-based applications, with support for multiple named sets, variable descriptions, and resilient caching. Use the `Superpowers.Env` namespace for all new code.

### superpingasync
Type: Bridge  
Purpose: Provides an asynchronous "ping" communication bridge between web pages and the Superpowers Chrome extension, enabling pages to send a message and receive a standardized "pong" response.

#### Public API

##### Superpowers.asyncPing(message)
- Purpose:  
  Sends a message asynchronously to the Superpowers extension and receives a "pong" response. Useful for verifying communication with the extension or for simple round-trip messaging diagnostics.
- Parameters: 
  - `message` (string):  
    The message to send to the extension. Can be any string; if omitted or falsy, the response will indicate "no message".
- Returns:  
  `Promise<string>` — Resolves with a string response in the format `"Pong: <message>"`, where `<message>` is the value provided as the argument (or `"no message"` if none was provided).  
  The Promise will reject if the bridge communication fails.
- Example:
```javascript
// Basic usage: send a ping and handle the response
Superpowers.asyncPing('Hello, extension!')
  .then(response => {
    console.log("Received from extension:", response);
    // Example output: "Received from extension: Pong: Hello, extension!"
  })
  .catch(error => {
    console.error("Ping failed:", error);
    // Handle communication errors here
  });

// Edge case: call without a message
Superpowers.asyncPing()
  .then(response => {
    console.log("Received:", response);
    // Output: "Received: Pong: no message"
  })
  .catch(error => {
    console.error("Ping failed:", error);
  });
```

#### Caveats & Edge Cases
- The `message` parameter is optional; if omitted, the response will be `"Pong: no message"`.
- The method is asynchronous and always returns a Promise. You must use `.then()`/`.catch()` or `async/await` for proper handling.
- If the Superpowers extension is not installed, disabled, or the bridge fails to initialize, the Promise will reject with an error.
- No additional setup is required beyond the presence of the Superpowers extension and its content script injection.
- This method is intended for diagnostic or connectivity-check purposes; it does not transmit arbitrary data or trigger side effects in the extension.

---

**Summary:**  
`Superpowers.asyncPing(message)` is a simple, reliable asynchronous bridge method for verifying communication with the Superpowers extension, returning a standardized "pong" response for any string message.

### superping
Type: Utility  
Purpose: Provides a simple, synchronous "ping" mechanism for communication from the web page to the Superpowers extension. Primarily used for testing connectivity or triggering extension-side listeners without requiring a response.

#### Public API

##### Superpowers.ping(msg)
- Purpose:  
  Sends a "SUPERPING" message containing the provided payload (`msg`) from the web page to the Superpowers extension. This method is synchronous from the page's perspective: it immediately returns the input value. The message is delivered to the extension in a fire-and-forget manner—no response or acknowledgment is returned to the page.
- Parameters:
  - `msg` (any): The payload to send with the ping. Can be any serializable value (string, number, object, etc.). There are no constraints on the value.
- Returns:  
  The exact value of `msg` (synchronously). No asynchronous result or Promise is involved.
- Example:
```javascript
// Send a ping with a simple string payload
const result = Superpowers.ping('hello-extension');
console.log('Ping result:', result); // Output: 'hello-extension'

// Send a ping with an object payload
const payload = { user: 'alice', timestamp: Date.now() };
const echo = Superpowers.ping(payload);
console.log('Ping result:', echo); // Output: { user: 'alice', timestamp: ... }
```

#### Caveats & Edge Cases

- **No Response Mechanism:**  
  `Superpowers.ping` does not provide any way to receive a response or acknowledgment from the extension. It is strictly fire-and-forget. If you need a round-trip or confirmation, you must implement a different communication pattern.
- **Synchronous Return:**  
  The method returns the input value immediately. It does not return a Promise or perform any asynchronous operation from the caller's perspective.
- **Payload Serialization:**  
  The payload (`msg`) should be serializable, as it is transmitted via `window.postMessage`. Non-serializable values (e.g., functions, DOM nodes, circular references) will not be transmitted correctly.
- **No Error Handling:**  
  The method does not throw or return errors under any circumstances. If the extension is not installed or the content script is not present, the message will simply be ignored.
- **No Setup Required:**  
  No additional setup or permissions are required beyond having the Superpowers extension (with the superping plugin) installed and active on the page.

---

**Summary:**  
`Superpowers.ping(msg)` is a minimal, synchronous utility for sending a one-way message from the page to the Superpowers extension. It is best suited for connectivity checks, extension presence detection, or triggering extension-side listeners where no response is needed.

### superpages
Type: System  
Purpose:  
The "superpages" plugin provides a secure, extension-mediated mechanism for web pages to generate Blob URLs from arbitrary content, with optional filename and MIME type specification. This enables safe, extension-controlled creation of downloadable or displayable resources directly from JavaScript, while ensuring extension-level acknowledgment and resource management.

#### Public API

##### Superpowers.pages(content, options)
- Purpose:  
  Creates a Blob from the provided content and returns a Blob URL (object URL) that can be used in the page (e.g., for downloads, previews, or resource loading). The operation is mediated by the extension for security and resource management, and is asynchronous.
- Parameters:
  - `content` (string | ArrayBuffer | Blob):  
    The data to be stored in the Blob. Typically a string, but can be any Blob-compatible data type. If `undefined`, an empty string is used.
  - `options` (object, optional):  
    Additional options for Blob creation.
    - `filename` (string, optional):  
      Suggested filename for the Blob. (Currently not used by the plugin, but reserved for future use or for page-side tracking.)
    - `mimeType` (string, optional):  
      The MIME type for the Blob. Defaults to `"text/plain"` if not specified.
- Returns:  
  `Promise<string>`  
  Resolves to a Blob URL (object URL) string (e.g., `"blob:https://example.com/..."`).  
  Rejects with an error message string if the operation fails (e.g., extension communication error, blob creation error).

- Example:
```javascript
// Example: Create a downloadable text file from a string
Superpowers.pages("Hello, world!", {
  filename: "greeting.txt",
  mimeType: "text/plain"
})
  .then(blobUrl => {
    // Create a download link and trigger download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = "greeting.txt";
    a.textContent = "Download greeting.txt";
    document.body.appendChild(a);
    // Optionally, trigger the download automatically:
    // a.click();
  })
  .catch(error => {
    console.error("Failed to create Blob URL:", error);
    // Handle error (e.g., show user feedback)
  });

// Example: Create a Blob URL for an image (base64 data)
const base64Image = atob("iVBORw0KGgoAAAANSUhEUgAA..."); // truncated
Superpowers.pages(base64Image, { mimeType: "image/png" })
  .then(blobUrl => {
    const img = document.createElement('img');
    img.src = blobUrl;
    document.body.appendChild(img);
  })
  .catch(error => {
    console.error("Image Blob creation failed:", error);
  });
```

#### Caveats & Edge Cases

- **Asynchronous:**  
  The method always returns a Promise. All Blob URL creation is asynchronous and mediated by the extension for security.
- **Extension Dependency:**  
  Requires the Superpowers Chrome extension (with the "superpages" plugin) to be installed and active. If the extension is not present or communication fails, the Promise will reject with an error.
- **Blob URL Lifetime & Cleanup:**  
  Blob URLs are managed in the extension's content script. The plugin tracks up to 50 active Blob URLs per page context; older URLs are revoked automatically if this limit is exceeded. If you need a Blob URL to persist, use it promptly or manage your own revocation logic if necessary.
- **Filename Option:**  
  The `filename` option is currently not used by the plugin for any automatic download or file naming logic. It is passed through for potential future use or for your own tracking.
- **MIME Type Default:**  
  If `mimeType` is not specified, the Blob will default to `"text/plain"`.
- **Error Handling:**  
  Errors may occur if the extension is unavailable, communication with the extension fails, or Blob creation fails (e.g., due to invalid data types). Always use `.catch()` to handle errors.
- **Security:**  
  The content is not inspected or sanitized by the plugin. Ensure you do not generate Blob URLs for untrusted or sensitive data unless you understand the security implications.
- **No Automatic Revocation:**  
  Blob URLs are not automatically revoked when you are done using them. For best practices, call `URL.revokeObjectURL(blobUrl)` when the Blob URL is no longer needed to free resources.

---

**Summary:**  
`Superpowers.pages(content, options)` is the sole public API of the "superpages" plugin, providing a secure, extension-mediated way to create Blob URLs from arbitrary content in a Chrome extension context. Use it for downloads, previews, or any scenario where you need a Blob URL, and always handle the returned Promise for robust error management.

### superopenai

Type: **Integration**

Purpose:  
The `superopenai` plugin integrates the OpenAI API into web pages via the Superpowers Chrome extension, exposing a comprehensive, promise-based API under `window.Superpowers.OpenAI`. It enables advanced OpenAI capabilities—including chat completions (with streaming), image generation, audio processing, embeddings, fine-tuning, file/model/batch management, and more—directly from the browser context, with secure credential handling and seamless extension bridging.

---

#### Public API

All methods are exposed under `window.Superpowers.OpenAI`.  
All methods return Promises and are asynchronous unless otherwise noted.

---

##### Superpowers.OpenAI.setApiKey(apiKey)

- **Purpose:**  
  Sets the OpenAI API key for all subsequent API calls. This is required before making any requests unless the key is already stored in the Superpowers extension environment.

- **Parameters:**
  - `apiKey` (string): The OpenAI API key. Must be a valid, non-empty string.

- **Returns:**  
  `Promise<string>` — Resolves to a confirmation message on success.

- **Example:**
  ```javascript
  Superpowers.OpenAI.setApiKey('sk-...')
    .then(msg => console.log(msg))
    .catch(err => console.error("Failed to set API key:", err));
  ```

---

##### Superpowers.OpenAI.setOrganizationId(organizationId)

- **Purpose:**  
  Sets the OpenAI Organization ID for API calls that require it.

- **Parameters:**
  - `organizationId` (string): The OpenAI organization ID.

- **Returns:**  
  `Promise<string>` — Resolves to a confirmation message on success.

- **Example:**
  ```javascript
  Superpowers.OpenAI.setOrganizationId('org-...')
    .then(msg => console.log(msg))
    .catch(err => console.error("Failed to set org ID:", err));
  ```

---

##### Superpowers.OpenAI.test()

- **Purpose:**  
  Verifies that the OpenAI extension bridge is operational.

- **Parameters:**  
  None

- **Returns:**  
  `Promise<string>` — Resolves to a status message.

- **Example:**
  ```javascript
  Superpowers.OpenAI.test()
    .then(msg => console.log("Status:", msg))
    .catch(err => console.error("Test failed:", err));
  ```

---

##### Superpowers.OpenAI.chatCompletion(payload)

- **Purpose:**  
  Performs a non-streaming OpenAI chat completion (supports GPT-3.5/4, o1/o3 models, etc.).

- **Parameters:**
  - `payload` (object):  
    - `model` (string, optional): Model name (e.g., `"gpt-4o"`, `"gpt-3.5-turbo"`, `"o1-mini"`). Defaults to `"gpt-4o"`.
    - `messages` (array): Array of message objects `{role, content}`.
    - `max_tokens` (number, optional): Maximum tokens for completion.
    - `temperature` (number, optional): Sampling temperature.
    - Additional OpenAI API parameters as needed.

- **Returns:**  
  `Promise<object>` — Resolves to the OpenAI API response object.

- **Example:**
  ```javascript
  Superpowers.OpenAI.chatCompletion({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What's the weather today?" }
    ]
  })
    .then(response => {
      console.log("Chat result:", response);
    })
    .catch(error => {
      console.error("Chat error:", error);
    });
  ```

---

##### Superpowers.OpenAI.chatCompletionStream(payload)

- **Purpose:**  
  Performs a streaming OpenAI chat completion, emitting partial results as they arrive.  
  **Streaming events** are delivered to the page as custom events:
  - `SUPEROPENAI_STREAM_CHUNK` — `{ detail: [requestId, chunk] }`
  - `SUPEROPENAI_RESPONSE` — `{ detail: [requestId, finalResult] }`

- **Parameters:**
  - `payload` (object): Same as `chatCompletion`.

- **Returns:**  
  `Promise<{ success: boolean, message: string }>` — Resolves when the stream completes.

- **Usage Pattern:**
  1. Call `chatCompletionStream(payload)`.
  2. Listen for `SUPEROPENAI_STREAM_CHUNK` events on `window` to receive partial results.
  3. Listen for `SUPEROPENAI_RESPONSE` for the final result or error.

- **Example:**
  ```javascript
  // Start streaming
  Superpowers.OpenAI.chatCompletionStream({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "Tell me a story." }
    ]
  })
    .then(() => console.log("Stream completed"))
    .catch(err => console.error("Stream error:", err));

  // Listen for stream chunks
  window.addEventListener("SUPEROPENAI_STREAM_CHUNK", (event) => {
    const [requestId, chunk] = event.detail;
    console.log("Stream chunk:", chunk);
    // Process/display chunk. Chunks are OpenAI API delta objects.
  });

  // Listen for final response or error
  window.addEventListener("SUPEROPENAI_RESPONSE", (event) => {
    const [requestId, result] = event.detail;
    console.log("Final result:", result);
  });
  ```

---

##### Superpowers.OpenAI.imageGeneration(payload)

- **Purpose:**  
  Generates images using OpenAI's DALL-E models.

- **Parameters:**
  - `payload` (object):
    - `model` (string, optional): e.g., `"dall-e-3"`. Defaults to `"dall-e-3"`.
    - `prompt` (string): Image prompt.
    - `n` (number, optional): Number of images. Default: 1.
    - `size` (string, optional): e.g., `"1024x1024"`.

- **Returns:**  
  `Promise<object>` — Resolves to the OpenAI image generation response.

- **Example:**
  ```javascript
  Superpowers.OpenAI.imageGeneration({
    prompt: "A futuristic cityscape at sunset"
  })
    .then(result => {
      console.log("Image URLs:", result.data.map(img => img.url));
    })
    .catch(err => console.error("Image generation failed:", err));
  ```

---

##### Superpowers.OpenAI.structuredCompletion(payload)

- **Purpose:**  
  Performs a chat completion with a structured (JSON/object) response, supporting OpenAI's `response_format` and `json_schema`.

- **Parameters:**
  - `payload` (object):  
    - All `chatCompletion` fields.
    - `responseFormat` (object, optional): OpenAI `response_format` object.
    - `json_schema` (object, optional): JSON schema for structured output.

- **Returns:**  
  `Promise<object>` — Resolves to the structured completion response.

- **Example:**
  ```javascript
  Superpowers.OpenAI.structuredCompletion({
    messages: [
      { role: "user", content: "Summarize this text as JSON." }
    ],
    json_schema: {
      name: "Summary",
      description: "A summary object",
      properties: { summary: { type: "string" } }
    }
  })
    .then(result => console.log("Structured result:", result))
    .catch(err => console.error("Structured completion error:", err));
  ```

---

##### Superpowers.OpenAI.functionCall(payload)

- **Purpose:**  
  Performs a chat completion with OpenAI function/tool calling support.

- **Parameters:**
  - `payload` (object):  
    - All `chatCompletion` fields.
    - `tools` (array, optional): OpenAI tool definitions.
    - `toolChoice` (string/object, optional): Tool selection.

- **Returns:**  
  `Promise<object>` — Resolves to the function call response.

- **Example:**
  ```javascript
  Superpowers.OpenAI.functionCall({
    messages: [
      { role: "user", content: "Get the current time in Tokyo." }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "getTime",
          description: "Get current time for a city",
          parameters: { type: "object", properties: { city: { type: "string" } } }
        }
      }
    ],
    toolChoice: "auto"
  })
    .then(result => console.log("Function call result:", result))
    .catch(err => console.error("Function call error:", err));
  ```

---

##### Superpowers.OpenAI.audioSpeech(payload)

- **Purpose:**  
  Generates speech audio from text using OpenAI's TTS models.

- **Parameters:**
  - `payload` (object):
    - `model` (string, optional): e.g., `"tts-1"`.
    - `input` (string): Text to synthesize.
    - `voice` (string, optional): e.g., `"alloy"`.
    - `response_format` (string, optional): e.g., `"mp3"`.
    - `speed` (number, optional): Playback speed.

- **Returns:**  
  `Promise<string>` — Resolves to the audio data (as a string, typically base64 or binary).

- **Example:**
  ```javascript
  Superpowers.OpenAI.audioSpeech({
    input: "Hello, world!"
  })
    .then(audioData => {
      // Use audioData as needed (e.g., create a Blob and play)
    })
    .catch(err => console.error("TTS error:", err));
  ```

---

##### Superpowers.OpenAI.audioTranscription(payload)

- **Purpose:**  
  Transcribes audio files to text using OpenAI's Whisper model.

- **Parameters:**
  - `payload` (object):
    - `file` (File|Blob): Audio file to transcribe.
    - `model` (string, optional): e.g., `"whisper-1"`.
    - `language` (string, optional): Language code.
    - `prompt` (string, optional): Prompt for context.
    - `response_format` (string, optional): e.g., `"json"`.
    - `temperature` (number, optional): Sampling temperature.

- **Returns:**  
  `Promise<object>` — Resolves to the transcription result.

- **Example:**
  ```javascript
  Superpowers.OpenAI.audioTranscription({
    file: myAudioFile
  })
    .then(result => console.log("Transcription:", result.text))
    .catch(err => console.error("Transcription error:", err));
  ```

---

##### Superpowers.OpenAI.audioTranslation(payload)

- **Purpose:**  
  Translates audio files to English using OpenAI's Whisper model.

- **Parameters:**
  - `payload` (object): Same as `audioTranscription`.

- **Returns:**  
  `Promise<object>` — Resolves to the translation result.

- **Example:**
  ```javascript
  Superpowers.OpenAI.audioTranslation({
    file: myAudioFile
  })
    .then(result => console.log("Translation:", result.text))
    .catch(err => console.error("Translation error:", err));
  ```

---

##### Superpowers.OpenAI.embeddings(payload)

- **Purpose:**  
  Generates vector embeddings for text input.

- **Parameters:**
  - `payload` (object):
    - `model` (string, optional): e.g., `"text-embedding-ada-002"`.
    - `input` (string|array): Text or array of texts.
    - `

### superreadme
Type: System  
Purpose: Provides programmatic access to the Superpowers extension’s bundled README files, enabling web pages to retrieve documentation (including LLM-specific and main README content) directly via the `window.Superpowers.readme` API.

---

#### Public API

##### Superpowers.readme.getLLMReadme()
- Purpose:  
  Retrieves the contents of the LLM-specific README file bundled with the Superpowers extension. This is useful for dynamically displaying or processing documentation related to LLM (Large Language Model) features or integrations.
- Parameters:  
  None
- Returns:  
  `Promise<string>` — Resolves with the full text content of the LLM README file. If neither expected file is found, the Promise is rejected with an error.
- Example:
```javascript
Superpowers.readme.getLLMReadme()
  .then(readmeText => {
    console.log("LLM README contents:", readmeText);
    // Example: Display in a modal or documentation viewer
    document.getElementById('llm-readme').textContent = readmeText;
  })
  .catch(error => {
    console.error("Failed to load LLM README:", error);
    // Example: Show user-friendly error message
    alert("LLM documentation is currently unavailable.");
  });
```

---

##### Superpowers.readme.getMainReadme()
- Purpose:  
  Retrieves the contents of the main README file (`README.md`) bundled with the Superpowers extension. Use this to programmatically access general documentation or display it within your application.
- Parameters:  
  None
- Returns:  
  `Promise<string>` — Resolves with the full text content of the main README file. If the file is not found, the Promise is rejected with an error.
- Example:
```javascript
Superpowers.readme.getMainReadme()
  .then(readmeText => {
    console.log("Main README contents:", readmeText);
    // Example: Render markdown to HTML
    document.getElementById('main-readme').textContent = readmeText;
  })
  .catch(error => {
    console.error("Failed to load main README:", error);
    // Example: Fallback UI
    document.getElementById('main-readme').textContent = "Documentation unavailable.";
  });
```

---

#### Caveats & Edge Cases

- **File Locations:**  
  - `getLLMReadme()` first attempts to load `Readme-LLM.md`. If not found, it falls back to `README-LLM.md`. If neither exists, the Promise is rejected.
  - `getMainReadme()` only attempts to load `README.md`.
- **File Availability:**  
  - If the expected README files are not packaged with the extension, the methods will reject with a descriptive error.
- **Asynchronous API:**  
  - Both methods are asynchronous and return Promises. Always use `.then()`/`.catch()` or `async/await` with proper error handling.
- **Read-Only:**  
  - The API is strictly for reading documentation files. It does not support writing or modifying any files.
- **No Markdown Rendering:**  
  - Returned content is raw markdown text. Rendering or parsing is the responsibility of the caller.
- **Extension Dependency:**  
  - Requires the Superpowers Chrome extension to be installed and active. If the extension is not present, `window.Superpowers.readme` will be undefined.
- **No Parameters:**  
  - Both methods do not accept any parameters. Passing arguments has no effect.

---

**Summary:**  
The `superreadme` plugin exposes a simple, robust API for retrieving extension-bundled documentation files via `window.Superpowers.readme`. It is ideal for advanced integrations, dynamic documentation displays, or developer tooling within web applications that interact with the Superpowers extension.

### superstorage
- **No text files** found for plugin.

### superruntime
Type: System  
Purpose: Provides a secure, promise-based bridge to selected [chrome.runtime](https://developer.chrome.com/docs/extensions/reference/runtime/) APIs and events from content/page scripts, enabling advanced extension-system interactions and event listening for web applications running under the Superpowers extension.

#### Public API

##### Superpowers.runtime(methodName, ...args)
- Purpose:  
  Invokes a method on the [chrome.runtime](https://developer.chrome.com/docs/extensions/reference/runtime/) API from the page context, returning a Promise for the result. This enables web pages to interact with extension-level runtime features (such as messaging, ID queries, etc.) in a secure, asynchronous manner.
- Parameters:
  - `methodName` (string):  
    The exact name of the [chrome.runtime](https://developer.chrome.com/docs/extensions/reference/runtime/) method to invoke (e.g., `"getManifest"`, `"sendMessage"`, `"getURL"`, etc.). Must correspond to a function on `chrome.runtime`.
  - `...args` (any):  
    Arguments to pass to the specified `chrome.runtime` method. The number and types of arguments must match the signature of the target method. For callback-based methods, do **not** supply the callback; the bridge handles this and always returns a Promise.
- Returns:  
  `Promise<any>` — Resolves with the result of the invoked `chrome.runtime` method, or rejects with an `Error` if the method does not exist, the call fails, or the extension is disabled.
- Example:
```javascript
// Example: Get the extension's manifest
Superpowers.runtime('getManifest')
  .then(manifest => {
    console.log("Extension manifest:", manifest);
    // Use manifest fields as needed
  })
  .catch(error => {
    console.error("Failed to get manifest:", error);
    // Handle error appropriately
  });

// Example: Send a message to the background script
Superpowers.runtime('sendMessage', { type: 'PING' })
  .then(response => {
    console.log("Background response:", response);
  })
  .catch(error => {
    console.error("Message failed:", error);
  });

// Example: Get the extension's URL for a resource
Superpowers.runtime('getURL', 'images/icon.png')
  .then(url => {
    console.log("Resource URL:", url);
  })
  .catch(error => {
    console.error("Could not get URL:", error);
  });
```

##### Superpowers.runtime.turnOn()
- Purpose:  
  Enables the superruntime bridge, allowing calls to `Superpowers.runtime` and event listening to function. Must be called before using any runtime features.
- Parameters:  
  None
- Returns:  
  `void`
- Example:
```javascript
// Enable the runtime bridge before making any calls
Superpowers.runtime.turnOn();
```

##### Superpowers.runtime.turnOff()
- Purpose:  
  Disables the superruntime bridge, preventing further calls to `Superpowers.runtime` and stopping event propagation. Useful for cleanup or to restrict access.
- Parameters:  
  None
- Returns:  
  `void`
- Example:
```javascript
// Disable the runtime bridge when no longer needed
Superpowers.runtime.turnOff();
```

---

#### Caveats & Edge Cases

- **Required Setup:**  
  You **must** call `Superpowers.runtime.turnOn()` before invoking any `Superpowers.runtime` methods or subscribing to runtime events. If the bridge is not enabled, all calls will fail with an error: `"Superruntime is not enabled"`.

- **Method Name Constraints:**  
  - Only methods that exist on `chrome.runtime` can be called. Attempting to call a non-existent method will reject the Promise with an error.
  - For callback-based methods, **do not** supply the callback; the bridge automatically handles conversion to a Promise.

- **Arguments:**  
  - You are responsible for passing the correct arguments for the target `chrome.runtime` method. Incorrect arguments may result in runtime errors or rejected Promises.
  - The bridge supports both Promise-based (MV3) and callback-based (MV2) Chrome extension APIs.

- **Event Handling:**  
  - The bridge internally listens to major `chrome.runtime` events (e.g., `onMessage`, `onInstalled`, `onStartup`, etc.) and can propagate them, but **no public event subscription API is exposed via `window.Superpowers.runtime`** in the current implementation. If event subscription becomes available, refer to updated documentation.

- **Extension Context:**  
  - All calls are subject to the permissions and context of the Superpowers extension. Some `chrome.runtime` methods may be restricted or unavailable depending on extension manifest and browser version.

- **Error Handling:**  
  - All errors (including Chrome runtime errors and bridge errors) are surfaced as rejected Promises. Always use `.catch()` or `try/catch` with `async/await` to handle failures robustly.

- **Disabling:**  
  - After calling `Superpowers.runtime.turnOff()`, all further calls to `Superpowers.runtime` will fail until `turnOn()` is called again.

---

**Summary:**  
The `superruntime` plugin exposes a secure, Promise-based interface for invoking `chrome.runtime` methods from web pages via `window.Superpowers.runtime`. It requires explicit enabling and provides robust error handling, but does not currently expose direct event subscription APIs. Use this bridge for advanced extension-system integration scenarios where direct runtime access is needed from the page context.

### superscreenshot
Type: Utility  
Purpose: Provides advanced screenshot capabilities to web pages via the Superpowers Chrome extension, allowing programmatic capture of visible or full-page screenshots from any tab or URL, with extensive configuration options.

---

#### Public API

##### Superpowers.screenshot(config)
- Purpose:  
  Captures a screenshot of a specified browser tab or a newly opened URL, supporting both visible viewport and full-page modes. The method is highly configurable, allowing control over image format, quality, capture delay, window size, and optional CSS/JS injection before capture. Returns a Promise that resolves to a data URL of the captured image.
- Parameters:  
  - `config` (Object | string | number, optional):  
    - If an object, must conform to the following structure:
      - `url` (string, optional): The URL to open and capture. Required if `tabId` is not provided.
      - `tabId` (number, optional): The Chrome tab ID to capture. Required if `url` is not provided.
      - `captureMode` ("visible" | "full", default: "visible"):  
        - `"visible"`: Captures only the visible viewport.  
        - `"full"`: Captures the entire scrollable page by stitching multiple screenshots.
      - `format` ("png" | "jpeg", default: "png"): Image format for the screenshot.
      - `quality` (number, default: 100): JPEG quality (0–100). Ignored for PNG.
      - `delayMs` (number, default: 1000): Delay in milliseconds before capture (useful for dynamic content).
      - `keepTabOpen` (boolean, default: false): If true, keeps any newly created tab/window open after capture.
      - `width` (number, optional): Desired window width (only used if creating a new window).
      - `height` (number, optional): Desired window height (only used if creating a new window).
      - `injectCss` (string, optional): CSS code to inject into the page before capture.
      - `injectJs` (string, optional): JavaScript code to inject into the page before capture.
    - If a string, it is treated as `{ url: <string> }`.
    - If a number, it is treated as `{ tabId: <number> }`.
- Returns:  
  - `Promise<string>`: Resolves to a data URL (e.g., `"data:image/png;base64,..."`) representing the screenshot image. Rejects with an `Error` if capture fails or parameters are invalid.
- Example:
```javascript
// Capture a full-page JPEG screenshot of a specific URL, injecting custom CSS and JS
Superpowers.screenshot({
  url: "https://example.com",
  captureMode: "full",
  format: "jpeg",
  quality: 90,
  delayMs: 2000,
  width: 1440,
  height: 900,
  injectCss: "body { background: #fff !important; }",
  injectJs: "document.body.setAttribute('data-captured', 'true');"
})
  .then(dataUrl => {
    // Use the screenshot data URL (e.g., display in an <img> or upload)
    const img = document.createElement('img');
    img.src = dataUrl;
    document.body.appendChild(img);
  })
  .catch(error => {
    // Handle errors (invalid params, navigation failure, capture errors, etc.)
    console.error("Screenshot failed:", error);
  });

// Minimal usage: capture the visible viewport of the current tab (tabId known)
Superpowers.screenshot({ tabId: 123 })
  .then(dataUrl => { /* ... */ })
  .catch(error => { /* ... */ });

// Shorthand: capture the visible viewport of a URL
Superpowers.screenshot("https://example.com")
  .then(dataUrl => { /* ... */ });
```

---

#### Caveats & Edge Cases

- **Required Parameters:**  
  You must provide at least one of `url` or `tabId`. If both are omitted, the Promise rejects with an error.
- **Format and Quality:**  
  - `format` must be `"png"` or `"jpeg"`. Any other value causes rejection.
  - `quality` is only used for JPEG; for PNG, it is ignored.
  - `quality` must be a number between 0 and 100 (inclusive).
- **Window/Tab Creation:**  
  - If `tabId` is not provided, a new tab or window is created to load the specified `url`.
  - If `width` or `height` is specified, a new window is created at that size; otherwise, a background tab is used.
  - If `keepTabOpen` is `false` (default), any tab/window created for the screenshot is closed after capture. If `true`, it remains open.
- **Delays and Dynamic Content:**  
  - The `delayMs` parameter allows waiting for dynamic content to load before capture. For complex pages, increase this value as needed.
  - Additional delays are automatically applied after JS injection and before capture to improve reliability.
- **CSS/JS Injection:**  
  - `injectCss` and `injectJs` are injected before capture. Syntax errors or runtime errors in injected JS are logged but do not halt the screenshot process unless they cause page instability.
- **Full-Page Capture:**  
  - `"full"` mode scrolls and stitches the page. Extremely tall pages may take longer or hit browser resource limits.
  - Each scroll/capture step has its own timeout (30s per step).
- **Permissions & Extension Requirements:**  
  - The Superpowers Chrome extension must be installed and active.
  - The extension must have permission to access the target tab or URL.
  - Some pages (e.g., Chrome Web Store, browser-internal pages, or those with restrictive CSP) may block script/CSS injection or screenshot capture.
- **Timeouts:**  
  - The bridge has a built-in timeout (typically 30 seconds). Long-running captures may be aborted if they exceed this limit.
- **Error Handling:**  
  - All errors are surfaced via Promise rejection with a descriptive `Error` object.
  - If a tab/window is created but capture fails, the extension attempts to clean up (close) the created resources unless `keepTabOpen` is `true`.

---

**Note:**  
This API is asynchronous and returns a Promise. Always use `.then()`/`.catch()` or `async/await` with proper error handling.  
No events or progress notifications are currently exposed to the page; only the final result or error is returned.

### supertabs
Type: Bridge  
Purpose: Provides a secure, Promise-based bridge to the Chrome `chrome.tabs` API and tab events, enabling web pages to query, manipulate, and listen to browser tab changes via `window.Superpowers.tabs`.

#### Public API

##### Superpowers.tabs.\<method\>(...args)
- Purpose:  
  Invokes any method from the [Chrome `chrome.tabs` API](https://developer.chrome.com/docs/extensions/reference/tabs/) directly from the web page context. All methods return Promises and mirror the signature and behavior of their Chrome API counterparts.
- Parameters:  
  - `...args` (any): Arguments required by the specific `chrome.tabs` method being called. Refer to the [Chrome Tabs API documentation](https://developer.chrome.com/docs/extensions/reference/tabs/) for method signatures and parameter details.
- Returns:  
  - `Promise<any>`: Resolves with the result of the Chrome Tabs API method, or rejects with an `Error` if the method fails or does not exist.
- Example:
```javascript
// Query all active tabs in the current window
Superpowers.tabs.query({ active: true, currentWindow: true })
  .then(tabs => {
    console.log("Active tabs:", tabs);
    // tabs is an array of Tab objects
  })
  .catch(error => {
    console.error("Failed to query tabs:", error);
  });

// Create a new tab and handle errors
Superpowers.tabs.create({ url: "https://developer.chrome.com" })
  .then(tab => {
    console.log("Created tab:", tab);
  })
  .catch(error => {
    console.error("Failed to create tab:", error);
  });

// Remove a tab by ID
Superpowers.tabs.remove(123)
  .then(() => {
    console.log("Tab removed");
  })
  .catch(error => {
    console.error("Failed to remove tab:", error);
  });
```

##### Superpowers.tabs.onCreated.addListener(callback)
##### Superpowers.tabs.onUpdated.addListener(callback)
##### Superpowers.tabs.onRemoved.addListener(callback)
##### Superpowers.tabs.onActivated.addListener(callback)
##### Superpowers.tabs.onAttached.addListener(callback)
##### Superpowers.tabs.onDetached.addListener(callback)
##### Superpowers.tabs.onHighlighted.addListener(callback)
##### Superpowers.tabs.onMoved.addListener(callback)
##### Superpowers.tabs.onReplaced.addListener(callback)
##### Superpowers.tabs.onZoomChange.addListener(callback)
- Purpose:  
  Listen for Chrome tab events directly in the page context. These event objects mirror the [chrome.tabs events](https://developer.chrome.com/docs/extensions/reference/tabs/#events) and allow you to react to tab lifecycle changes.
- Parameters:  
  - `callback` (Function): Function to be called when the event occurs. The callback receives the same arguments as the corresponding Chrome Tabs event.
- Returns:  
  - `void`
- Example:
```javascript
// Listen for new tabs being created
Superpowers.tabs.onCreated.addListener(function(tab) {
  console.log("Tab created:", tab);
});

// Listen for tab updates
Superpowers.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  console.log("Tab updated:", tabId, changeInfo, tab);
});

// Listen for tab removal
Superpowers.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("Tab removed:", tabId, removeInfo);
});
```

#### Caveats & Edge Cases

- **API Coverage:**  
  All methods and events from the [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/) are available, but only those supported by the current version of Chrome and the extension's permissions will work. Unsupported or misspelled methods will result in rejected Promises.

- **Permissions:**  
  The extension must have the appropriate permissions (e.g., `"tabs"`) in its manifest to access tab APIs. If permissions are missing, calls will fail.

- **Event Listener Lifetime:**  
  Event listeners added via `Superpowers.tabs.onX.addListener` are only active while the page is loaded and the extension is enabled. They do not persist across reloads.

- **Error Handling:**  
  All API methods return Promises. Always use `.catch()` or `try/catch` with `async/await` to handle errors, including permission issues, invalid arguments, or method unavailability.

- **Security:**  
  This bridge only exposes the Chrome Tabs API; it does not grant access to privileged tab data unless the extension has the necessary permissions.

- **Asynchronous Behavior:**  
  All methods are asynchronous and return Promises, even if the underlying Chrome API uses callbacks.

- **No Direct Access to chrome.tabs:**  
  You must use `Superpowers.tabs`—the native `chrome.tabs` object is not available in the page context.

- **Setup:**  
  No additional setup is required beyond having the Superpowers extension installed and enabled. The `window.Superpowers.tabs` object is injected automatically.

---

**Summary:**  
The `supertabs` plugin exposes the full Chrome Tabs API and tab events to web pages via `window.Superpowers.tabs`, using a Promise-based interface and event listeners that closely mirror the native Chrome extension APIs. This enables advanced tab management and monitoring from within any web page, subject to extension permissions and Chrome API support.

### supersidepanel
Type: Bridge  
Purpose: Provides a transparent bridge between in-page JavaScript and the Chrome `sidePanel` extension API, allowing web developers to control the browser's side panel (open, configure, query, etc.) via `window.Superpowers.sidePanel` methods.

---

#### Public API

##### Superpowers.sidePanel.open(options)
- Purpose: Opens the Chrome side panel for the current tab, optionally with specific options.
- Parameters:
  - `options` (Object, optional): Configuration for opening the side panel. Structure and supported fields are defined by the [Chrome `sidePanel.open`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-open) API. Typical fields include:
    - `tabId` (number, optional): The tab to open the side panel in.
    - `windowId` (number, optional): The window to open the side panel in.
- Returns: `Promise<void>` — Resolves when the side panel has been opened. Rejects if the operation fails (e.g., unsupported browser, invalid options).
- Example:
```javascript
Superpowers.sidePanel.open({ tabId: 123 })
  .then(() => {
    console.log("Side panel opened successfully.");
  })
  .catch(error => {
    console.error("Failed to open side panel:", error);
    // Handle errors such as unsupported browser or invalid tabId
  });
```

---

##### Superpowers.sidePanel.setOptions(options)
- Purpose: Sets configuration options for the side panel in the current context.
- Parameters:
  - `options` (Object): Options to set, as defined by the [Chrome `sidePanel.setOptions`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-setOptions) API. Typical fields include:
    - `tabId` (number, optional): The tab to set options for.
    - `path` (string, optional): The path to the HTML file to display in the side panel.
    - `enabled` (boolean, optional): Whether the side panel is enabled.
- Returns: `Promise<void>` — Resolves when options are set. Rejects on error.
- Example:
```javascript
Superpowers.sidePanel.setOptions({
  tabId: 123,
  path: 'sidepanel.html',
  enabled: true
})
  .then(() => {
    console.log("Side panel options set.");
  })
  .catch(error => {
    console.error("Failed to set side panel options:", error);
  });
```

---

##### Superpowers.sidePanel.getOptions(options)
- Purpose: Retrieves the current configuration options for the side panel.
- Parameters:
  - `options` (Object, optional): Query parameters, as defined by the [Chrome `sidePanel.getOptions`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-getOptions) API. Typical fields include:
    - `tabId` (number, optional): The tab to get options for.
- Returns: `Promise<Object>` — Resolves with the current options object. Rejects on error.
- Example:
```javascript
Superpowers.sidePanel.getOptions({ tabId: 123 })
  .then(options => {
    console.log("Current side panel options:", options);
    // Use options.path, options.enabled, etc.
  })
  .catch(error => {
    console.error("Failed to get side panel options:", error);
  });
```

---

##### Superpowers.sidePanel.setPanelBehavior(options)
- Purpose: Sets the behavior of the side panel (e.g., auto-open, context).
- Parameters:
  - `options` (Object): Behavior options as defined by the [Chrome `sidePanel.setPanelBehavior`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-setPanelBehavior) API.
- Returns: `Promise<void>` — Resolves when the behavior is set. Rejects on error.
- Example:
```javascript
Superpowers.sidePanel.setPanelBehavior({
  openPanelOnTabSwitch: true
})
  .then(() => {
    console.log("Side panel behavior set.");
  })
  .catch(error => {
    console.error("Failed to set side panel behavior:", error);
  });
```

---

##### Superpowers.sidePanel.getPanelBehavior(options)
- Purpose: Retrieves the current behavior settings of the side panel.
- Parameters:
  - `options` (Object, optional): Query parameters as defined by the [Chrome `sidePanel.getPanelBehavior`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-getPanelBehavior) API.
- Returns: `Promise<Object>` — Resolves with the current behavior settings object. Rejects on error.
- Example:
```javascript
Superpowers.sidePanel.getPanelBehavior()
  .then(behavior => {
    console.log("Current side panel behavior:", behavior);
    // Use behavior.openPanelOnTabSwitch, etc.
  })
  .catch(error => {
    console.error("Failed to get side panel behavior:", error);
  });
```

---

##### Superpowers.sidePanel.on(eventName, handler)
- Purpose: (Planned for future expansion) Registers an event listener for side panel events.  
  **Note:** As of this version, the Chrome `sidePanel` API does not emit any events, so this method is a no-op. It is included for forward compatibility.
- Parameters:
  - `eventName` (string): The name of the event to listen for.
  - `handler` (Function): The callback to invoke when the event occurs.
- Returns: `void`
- Example:
```javascript
// No events are currently supported, but usage would look like:
Superpowers.sidePanel.on('someEvent', (eventData) => {
  console.log("Side panel event:", eventData);
});
```

---

#### Event Listeners

Currently, the Chrome `sidePanel` API does not emit any events, and thus `Superpowers.sidePanel.on` is a placeholder for future compatibility. No events will be fired at this time.

---

#### Caveats & Edge Cases

- **Browser Support:** The Chrome `sidePanel` API is only available in recent versions of Chromium-based browsers. If unavailable, all methods will reject with an error.
- **API Parity:** The plugin is a thin bridge to the Chrome API. All parameters and return values should match the [official Chrome documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).
- **Asynchronous Behavior:** All methods return Promises, regardless of whether the underlying Chrome API uses callbacks or Promises. Always use `.then`/`.catch` or `async/await` for error handling.
- **No Events Yet:** While the API surface includes `.on()` for future-proofing, no events are currently emitted by the Chrome `sidePanel` API.
- **Permissions:** The extension must have the appropriate permissions to use the `sidePanel` API. If not, calls will fail.
- **Tab/Window Context:** Many methods accept `tabId` or `windowId`. Passing invalid or non-existent IDs will result in errors.
- **No Direct DOM Access:** This API does not provide direct access to the side panel's DOM or content, only to its configuration and visibility.

---

**Required Setup:**  
- The Superpowers extension (with the `supersidepanel` plugin enabled) must be installed and active in the browser.
- The page must access the API via `window.Superpowers.sidePanel`.

---

**References:**  
- [Chrome sidePanel API documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)  
- [Superpowers Extension Documentation](#) (if available)

### superwebnavigation
Type: Bridge  
Purpose: Provides a secure, Promise-based interface for invoking Chrome's `chrome.webNavigation` API methods and subscribing to its navigation events directly from web page scripts via `window.Superpowers.webNavigation`. This enables advanced navigation monitoring and control in Chrome extensions, abstracting away extension messaging and callback complexities.

#### Public API

##### Superpowers.webNavigation[methodName](...args)
- Purpose:  
  Dynamically invokes any method from the Chrome `chrome.webNavigation` API (e.g., `getAllFrames`, `getFrame`, etc.) from the web page context. All calls are proxied to the extension's background service worker and return a Promise that resolves or rejects based on the Chrome API's result.
- Parameters:
  - `methodName` (string):  
    The exact name of the `chrome.webNavigation` method to invoke (e.g., `"getAllFrames"`, `"getFrame"`, `"getFrameTree"`). Must correspond to a function on `chrome.webNavigation`.
  - `...args` (any[]):  
    Arguments to pass to the specified method. These must match the signature and types expected by the Chrome API. The final argument (callback) is handled automatically; do not supply it.
- Returns:  
  `Promise<any>` — Resolves with the result of the Chrome API call (if any), or `undefined` for methods that do not return a value. Rejects with an `Error` if the method does not exist or if the Chrome API reports an error.
- Example:
```javascript
// Example: Get all frames for the current tab
const tabId = 123; // Replace with a valid tab ID

Superpowers.webNavigation.getAllFrames(tabId)
  .then(frames => {
    console.log("Frames for tab:", frames);
    // frames is an object: { tabId, frames: [ { frameId, url, ... }, ... ] }
  })
  .catch(error => {
    console.error("webNavigation.getAllFrames failed:", error);
    // Handle error (e.g., invalid tabId, permissions, etc.)
  });

// Example: Get information about a specific frame
Superpowers.webNavigation.getFrame(tabId, { frameId: 0 })
  .then(frameInfo => {
    console.log("Frame info:", frameInfo);
    // frameInfo: { tabId, frameId, url, ... }
  })
  .catch(error => {
    console.error("webNavigation.getFrame failed:", error);
  });
```

##### Superpowers.webNavigation.on<EventName>.addListener(callback)
- Purpose:  
  Subscribes to Chrome `webNavigation` events from the web page context. Supported events are: `onBeforeNavigate`, `onCommitted`, `onDOMContentLoaded`, `onCompleted`, and `onErrorOccurred`. Listeners receive event details as provided by the Chrome API.
- Parameters:
  - `callback` (function):  
    Function to invoke when the event fires. Receives a single argument: the event details object (structure depends on the event type; see [Chrome webNavigation event docs](https://developer.chrome.com/docs/extensions/reference/webNavigation/#events)).
- Returns:  
  `undefined`
- Example:
```javascript
// Listen for navigation completions in the current tab
Superpowers.webNavigation.onCompleted.addListener(details => {
  console.log("Navigation completed:", details);
  // details: { tabId, frameId, url, ... }
});

// Listen for navigation errors
Superpowers.webNavigation.onErrorOccurred.addListener(details => {
  console.error("Navigation error:", details);
});
```

#### Caveats & Edge Cases

- **Permissions Required:**  
  The extension must have the `"webNavigation"` permission in its manifest. If not, all methods and events will fail or be unavailable.
- **Tab Context:**  
  Most `webNavigation` methods and events require a valid `tabId`. Ensure you have the correct tab context when invoking methods.
- **Method Validation:**  
  If you attempt to call a non-existent or unsupported method (e.g., typo in `methodName`), the Promise will reject with an error.
- **Callback Handling:**  
  Do **not** supply the callback argument to `webNavigation` methods; it is handled internally by the bridge.
- **Event Listener Removal:**  
  The event API mirrors Chrome's: use `Superpowers.webNavigation.on<EventName>.removeListener(callback)` to remove listeners.
- **Asynchronous Behavior:**  
  All method calls are asynchronous and return Promises, even if the underlying Chrome API is callback-based.
- **Error Handling:**  
  Always use `.catch()` or `try/catch` with `async/await` to handle errors, as Chrome APIs may fail for reasons such as invalid arguments, missing permissions, or tab closure.
- **No Direct Access to chrome.webNavigation:**  
  You cannot access `chrome.webNavigation` directly from the page; all access must go through `Superpowers.webNavigation`.

---

**Summary:**  
`Superpowers.webNavigation` provides a robust, Promise-based bridge to Chrome's navigation APIs and events, enabling advanced navigation monitoring and control from web page scripts in a secure, extension-mediated manner.

### superwebrequest
Type: Bridge  
Purpose: Provides a secure, promise-based bridge from web pages to selected Chrome `webRequest` extension APIs, enabling advanced network request control and event handling from content scripts or page context via `window.Superpowers.webrequest`.

---

#### Public API

##### Superpowers.webrequest.<methodName>(...args)
- Purpose:  
  Dynamically invokes supported methods on the Chrome `webRequest` API (primarily `handlerBehaviorChanged`), returning a Promise for asynchronous operation. This allows developers to trigger webRequest behaviors (such as resetting rules or flushing caches) from the page context.
- Parameters:
  - `methodName` (string):  
    The name of the Chrome `webRequest` method to invoke (e.g., `"handlerBehaviorChanged"`). Only methods that exist on `chrome.webRequest` and are permitted by the extension will succeed.
  - `...args` (any[]):  
    Arguments to pass to the specified `webRequest` method. The required arguments depend on the method being called. For `handlerBehaviorChanged`, no arguments are required.
- Returns:  
  `Promise<any>` — Resolves with the result of the invoked `webRequest` method (usually `undefined` for `handlerBehaviorChanged`). Rejects with an `Error` if the method does not exist, is not enabled, or if the underlying Chrome API call fails.
- Example:
```javascript
// Example: Reset Chrome's webRequest handler behavior (flushes rules/cache)
Superpowers.webrequest.handlerBehaviorChanged()
  .then(() => {
    console.log("webRequest handler behavior successfully reset.");
    // You can now safely update dynamic rules or listeners
  })
  .catch(error => {
    console.error("Failed to reset handler behavior:", error);
    // Handle permission issues, extension not enabled, or API errors
  });
```

---

##### Superpowers.webrequest.turnOn()
- Purpose:  
  Enables the `superwebrequest` bridge, activating event listeners and allowing subsequent `webrequest` method calls to succeed. Must be called before invoking any `webrequest` methods.
- Parameters:  
  None.
- Returns:  
  `void`
- Example:
```javascript
// Enable the superwebrequest bridge before making any webRequest calls
Superpowers.webrequest.turnOn();
```

---

##### Superpowers.webrequest.turnOff()
- Purpose:  
  Disables the `superwebrequest` bridge, removing event listeners and preventing further `webrequest` method calls until re-enabled. Useful for cleanup or reducing extension overhead.
- Parameters:  
  None.
- Returns:  
  `void`
- Example:
```javascript
// Disable the bridge when webRequest access is no longer needed
Superpowers.webrequest.turnOff();
```

---

#### Caveats & Edge Cases

- **Required Setup:**  
  You must call `Superpowers.webrequest.turnOn()` before invoking any `webrequest` methods. Calls made while the bridge is disabled will reject with an error.

- **Supported Methods:**  
  Only Chrome `webRequest` methods that are exposed and permitted by the extension can be called. As of this implementation, the primary supported method is `handlerBehaviorChanged`. Attempting to call unsupported or non-existent methods will result in a rejected Promise.

- **Permissions:**  
  The extension must have the appropriate permissions (`webRequest`, `webRequestBlocking`, and host permissions) for the requested operations to succeed.

- **Event Handling:**  
  While the bridge sets up listeners for all major `chrome.webRequest` events internally, these events are not currently exposed to the page context via `window.Superpowers.webrequest`. Only method invocation is supported.

- **Asynchronous Behavior:**  
  All method calls return Promises, regardless of whether the underlying Chrome API is callback- or Promise-based. Always use `.then()`/`.catch()` or `async/await` for proper error handling.

- **Error Handling:**  
  If the extension is disabled, permissions are missing, or the Chrome API call fails, the returned Promise will reject with an `Error` describing the failure.

- **No Direct Event Subscription:**  
  This API does not expose a way to subscribe to `webRequest` events (such as `onBeforeRequest`) from the page context. Only method invocation is supported.

- **Security:**  
  Only methods explicitly allowed by the extension are callable. Attempts to call arbitrary or sensitive methods will be rejected.

---

**Summary:**  
`Superpowers.webrequest` provides a minimal, promise-based bridge for invoking select Chrome `webRequest` methods from the page context, with explicit enable/disable control. It is designed for advanced use cases where programmatic control of network request handling is required, and should be used with care and proper error handling.

### superurlget

Type: **Bridge**  
Purpose:  
Provides programmatic, event-driven access to the rendered HTML, DOM, or text content of any publicly accessible URL, as loaded in a real browser tab. Enables advanced content retrieval—including after JavaScript rendering, CSS/JS injection, and event-based waits—directly from web pages via the `window.Superpowers.Urlget` namespace.

---

#### Public API

##### Superpowers.Urlget.getRenderedPage(url, [options])

- **Purpose:**  
  Loads the specified URL in a background browser tab, waits for the page to finish rendering (by default, after the `DOMContentLoaded` event), and returns a comprehensive snapshot including the page title, fully rendered HTML, and extracted text. Supports optional CSS/JS injection and custom event waits.
- **Parameters:**
  - `url` (**string**, required):  
    The absolute URL to load and capture. Must be a valid, non-empty string. Redirects are followed automatically.
  - `options` (**object**, optional):  
    Configuration object for advanced control:
    - `waitForEvent` (**string**, default: `'DOMContentLoaded'`):  
      The DOM event to wait for before capturing content. Common values: `'DOMContentLoaded'`, `'load'`.
    - `timeoutMs` (**number**, default: `30000`):  
      Maximum time (in milliseconds) to wait before aborting and rejecting the Promise.
    - `injectCss` (**string**, optional):  
      CSS code to inject into the page before capture.
    - `injectJs` (**string**, optional):  
      JavaScript code to inject and execute in the page context before capture.
    - `fallbackDelay` (**number**, default: `1000`):  
      Minimum wait time (ms) before forcibly capturing content if the event does not fire.
- **Returns:**  
  `Promise<object>` resolving to an object with the following structure:
  - `title` (**string**): Page title (if available)
  - `html` (**string**): Full HTML markup of the rendered page (`document.documentElement.outerHTML`)
  - `text` (**string**): Extracted visible text from the page body
  - `readyStateAtCapture` (**string**): Document ready state at the moment of capture
  - `timeOfCapture` (**string**): ISO timestamp of capture
  - `finalUrl` (**string**): The final URL after any redirects
  - `cssError` (**string**, optional): Error message if CSS injection failed
  - `jsError` (**string**, optional): Error message if JS injection failed

- **Example:**
```javascript
Superpowers.Urlget.getRenderedPage('https://news.ycombinator.com/', {
  waitForEvent: 'load',
  injectCss: 'body { background: #222; color: #fff; }',
  injectJs: 'console.log("Injected JS runs!");',
  timeoutMs: 20000
})
  .then(result => {
    console.log("Title:", result.title);
    console.log("HTML length:", result.html.length);
    console.log("Text preview:", result.text.slice(0, 200));
    // Use result.finalUrl, result.readyStateAtCapture, etc.
  })
  .catch(error => {
    console.error("Failed to fetch rendered page:", error);
  });
```

---

##### Superpowers.Urlget.getHtml(url, [options])

- **Purpose:**  
  Loads the specified URL in a background tab, waits for the configured event, and returns the fully rendered HTML markup of the page. Useful for retrieving the DOM after all scripts/styles have executed.
- **Parameters:**  
  Same as `getRenderedPage`.
- **Returns:**  
  `Promise<object>` with:
  - `html` (**string**): Full HTML markup
  - `readyStateAtCapture`, `timeOfCapture`, `finalUrl`, `cssError`, `jsError` (see above)
- **Example:**
```javascript
Superpowers.Urlget.getHtml('https://example.com/', {
  injectCss: 'h1 { color: red; }'
})
  .then(result => {
    document.body.innerHTML = result.html; // Render the fetched HTML locally
  })
  .catch(error => {
    alert("Could not fetch HTML: " + error.message);
  });
```

---

##### Superpowers.Urlget.getDom(url, [options])

- **Purpose:**  
  Alias for `getHtml`. Provided for semantic clarity; returns the full HTML markup of the loaded page.
- **Parameters:**  
  Same as `getHtml`.
- **Returns:**  
  Same as `getHtml`.
- **Example:**
```javascript
Superpowers.Urlget.getDom('https://example.org/')
  .then(result => {
    // Parse or analyze result.html as needed
  });
```

---

##### Superpowers.Urlget.getText(url, [options])

- **Purpose:**  
  Loads the specified URL, waits for rendering, and returns only the visible text content of the page body. Useful for extracting readable content or for text analysis.
- **Parameters:**  
  Same as `getRenderedPage`.
- **Returns:**  
  `Promise<object>` with:
  - `text` (**string**): Visible text from the page body
  - `readyStateAtCapture`, `timeOfCapture`, `finalUrl`, `cssError`, `jsError` (see above)
- **Example:**
```javascript
Superpowers.Urlget.getText('https://en.wikipedia.org/wiki/JavaScript')
  .then(result => {
    console.log("Extracted text:", result.text.slice(0, 500));
  })
  .catch(error => {
    // Handle network errors, timeouts, or invalid URLs
    if (error.message.includes('Timeout')) {
      // Special handling for timeouts
    }
    console.error(error);
  });
```

---

#### Event Listeners

- **Superpowers.Urlget.on(eventName, callback)**
  - Purpose:  
    Subscribe to plugin-level events (if any are emitted in future versions).  
    _Note: As of this version, no custom events are emitted by `superurlget`, but this method is available for future extensibility and bridge consistency._
  - Parameters:
    - `eventName` (**string**): Name of the event to listen for.
    - `callback` (**function**): Function to invoke when the event occurs.

---

#### Caveats & Edge Cases

- **Tab Usage:**  
  Each call opens a new background browser tab to load the target URL. The tab is automatically closed after capture, but rapid/frequent calls may hit browser tab limits or quotas.
- **URL Restrictions:**  
  - Only publicly accessible URLs are supported.  
  - URLs requiring authentication, CAPTCHAs, or CORS-restricted resources may not render as expected.
  - Invalid or empty URLs will immediately reject with an error.
- **Timeouts:**  
  - If the page fails to load or the specified event does not fire within `timeoutMs`, the Promise rejects.
  - The `fallbackDelay` ensures content is captured even if the event is missed, but may result in partial content for slow-loading pages.
- **Injection Errors:**  
  - If `injectCss` or `injectJs` fails, the error is reported in the result object (`cssError`, `jsError`), but the main Promise still resolves unless the failure prevents content capture.
- **Resource Usage:**  
  - Excessive use may impact browser performance due to tab creation/destruction.
- **Security:**  
  - Injected JS runs in the context of the loaded page. Malicious or buggy code may break the capture or cause side effects.
- **Dependencies:**  
  - Requires the Superpowers Chrome extension with the `superurlget` plugin enabled.
  - Only available in environments where `window.Superpowers.Urlget` is present (i.e., after the extension injects it).

---

**Best Practices:**
- Always validate URLs before calling.
- Use conservative timeouts and avoid flooding with parallel requests.
- Handle Promise rejections to avoid unhandled errors.
- Use injection features judiciously and sanitize any dynamic code.

---

**Summary:**  
The `superurlget` plugin exposes a robust, event-driven API for retrieving rendered web content from arbitrary URLs, with fine-grained control over timing, injection, and output format. All methods are asynchronous and return Promises, making them suitable for integration into modern JavaScript applications and workflows.

----

## Final Notes

----

### Best Practices

1. **Initialization**: Always use the `Superpowers.ready()` method to ensure the extension is fully loaded before using its features.

2. **Error Handling**: Implement proper error handling for all async operations, especially when communicating with external services.

3. **Security**: Be mindful of sensitive data. The Superpowers extension provides access to powerful APIs that should be used responsibly.

4. **Performance**: Some operations (like screenshots or large data fetches) can be resource-intensive. Consider the performance implications in your application design.

5. **Update Compatibility**: The extension is regularly updated with new features and improvements. Design your code to be resilient to API changes.

6. **AI**: When using the OpenAI model use "gpt-4.1" as the new default model. Older models like "gpt-4o"  or "gpt-3.5" are deprecated.

### Support and Contribution

If you encounter issues or have suggestions for improvements, please refer to the extension's GitHub repository for support options and contribution guidelines.

### License

The Superpowers extension is distributed under the appropriate license terms. Please refer to the LICENSE file in the repository for details.

---

*This documentation was automatically generated from the source code at Thursday, May 15, 2025 at 02:01 PM GMT+2.*

Happy coding with Superpowers!