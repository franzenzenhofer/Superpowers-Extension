> Last updated: Tuesday, January 28, 2025 at 01:03 PM GMT+1


# README-GPT.md

----
## Introduction 
----

Hello, GPT. Welcome to **Superpowers** — a powerful Chrome extension that injects a variety of augmented APIs into a webpage context. With **Superpowers**, you can perform cross-domain fetches, manage environment variables, handle tab interactions, capture screenshots, or even chat with OpenAI models, all from within a standard web page!

This README is specifically written to help another **GPT** (i.e., a generative AI system) understand how **Superpowers** works and how to use it effectively in code. By the end, you’ll know:

1. What **Superpowers** is and the basics of its architecture.
2. Which methods and objects the extension exposes (like `Superpowers.fetch`, `Superpowers.ping`, etc.).
3. How to integrate them in your own HTML/JS-based page, including best practices for ensuring the extension loads properly (via meta tags and DOM checks).

This document is structured in carefully delineated sections with `----` separators and is **at least 8,000 characters** (to ensure thoroughness). Let’s dive in!

----

## What is Superpowers?
----

**Superpowers** is a Chrome extension that, when installed and running, injects a global `window.Superpowers` object into any page that opts in via a `<meta name="superpowers" content="enabled" />` tag in the `<head>`. The extension also sets up bridging between the real page context and the extension’s service worker, allowing you (the page) to invoke powerful Chrome APIs that would ordinarily be inaccessible from standard JavaScript.

----

## Architecture Overview
----

1. **service_worker.js**: The main background service worker for the extension. It loads the plugin_manager, which registers each plugin’s `install(...)` method. This is where messages from content scripts or the page get routed.
2. **content_script.js**: Auto-injected script that runs in each tab. It listens for page messages (e.g., "SUPERFETCH", "SUPERENV_GET_VARS") and relays them to the service worker via `chrome.runtime.sendMessage()`.
3. **globals_injected (Deprecated)** or other bridging scripts: Historically, these might attach the bridging code directly to `window`. We now do it plugin by plugin. 
4. **Plugins**: Each plugin (e.g., superfetch, superenv, superping, superpages, etc.) has:
    - An `extension.js` (service worker logic)
    - A `content.js` (content script bridging)
    - A `page.js` (page-level `window.Superpowers.xxx = function() {...}`)

Each plugin extends the `Superpowers` object with new methods and properties. For instance, the `superfetch` plugin adds `Superpowers.fetch`, the `superenv` plugin adds `Superpowers.getEnvVars` and `Superpowers.setEnvVars`, etc.

----

Important:
 - All Superpower Scripts are full HTML single page apps. Always provide the full HTML, JS, CSS (in that order) content in one HTML file.
 - You are only ever allowed to return one code block per response. And it must be the full HTML superpowers single page app. Or dont return any code block at all. 
 - Always ad debugging console.log/info/warning/error to check if everything was set up correctly and if the application is running as expected.
 - In the case that you are iterrating over an existing codebase, make sure that there are no breaking changes.
 - Always make sure that the code is well commented and easy to understand.
 - Double check the code to make sure it works as expected and do a logic flow code anlysis to make sure that the code is working perfectly.
 - CSS should be minimal and functional. Aim for a responsive no breakpoints mobile first desing unless otherwise instructed.
 - Be friendly and professional and a great communicator who uses short clear sentences and bulletpoints.
 - make sure to escape code in markdown 100% correct. If there is one error in the escaping the code will not be rendered correctly and the app breaks. Only one code block per response allowed.

----

## Quick Start / Enabling Superpowers
----

To enable **Superpowers** in your page:

1. **Install the extension** in Chrome (the user must do this).
2. **Add the meta tag** in your page’s `<head>`:

   ```html
   <meta name="superpowers" content="enabled"/>
   ```

3. In your page script, wait until `window.Superpowers` is available. This often requires the page to fully load, plus a short delay for the content script to inject. A typical pattern:

   ```js
   function waitForSuperpowers() {
     return new Promise(resolve => {
       if (window.Superpowers) return resolve();
       const check = setInterval(() => {
         if (window.Superpowers) {
           clearInterval(check);
           resolve();
         }
       }, 100);
     });
   }

   (async () => {
     await waitForSuperpowers();
     console.log("Superpowers is ready!");
     // Now you can call window.Superpowers.fetch, .ping, etc.
   })();
   ```

----


# Superpowers Plugins Documentation





> Auto-generated plugin documentation



### storage
Type: Bridge  
Purpose: Facilitates communication between web page scripts and a browser extension's storage API, enabling seamless storage operations and event handling.

### Public API

#### Superpowers.storage.local.get(keys)
- Purpose: Retrieves values from the local storage area.
- Input: `keys` (string or array of strings) - The keys to retrieve.
- Returns: Promise resolving to an object containing the key-value pairs.
- Example:
  ```javascript
  window.Superpowers.storage.local.get(['key1', 'key2']).then((result) => {
    console.log(result.key1, result.key2);
  }).catch((error) => {
    console.error('Error retrieving local storage:', error);
  });
  ```

#### Superpowers.storage.local.set(items)
- Purpose: Stores key-value pairs in the local storage area.
- Input: `items` (object) - An object containing key-value pairs to store.
- Returns: Promise resolving when the operation completes.
- Example:
  ```javascript
  window.Superpowers.storage.local.set({ key1: 'value1', key2: 'value2' }).then(() => {
    console.log('Values stored successfully.');
  }).catch((error) => {
    console.error('Error storing values:', error);
  });
  ```

#### Superpowers.storage.local.remove(keys)
- Purpose: Removes items from the local storage area.
- Input: `keys` (string or array of strings) - The keys to remove.
- Returns: Promise resolving when the operation completes.
- Example:
  ```javascript
  window.Superpowers.storage.local.remove('key1').then(() => {
    console.log('Key removed successfully.');
  }).catch((error) => {
    console.error('Error removing key:', error);
  });
  ```

#### Superpowers.storage.local.clear()
- Purpose: Clears all items from the local storage area.
- Input: None
- Returns: Promise resolving when the operation completes.
- Example:
  ```javascript
  window.Superpowers.storage.local.clear().then(() => {
    console.log('Local storage cleared.');
  }).catch((error) => {
    console.error('Error clearing local storage:', error);
  });
  ```

#### Superpowers.storage.on(eventName, callback)
- Purpose: Registers an event listener for storage events.
- Input: 
  - `eventName` (string) - The name of the event to listen for (e.g., "onChanged").
  - `callback` (function) - The function to call when the event occurs.
- Returns: None
- Example:
  ```javascript
  window.Superpowers.storage.on('onChanged', (changes, areaName) => {
    console.log('Storage changed in area:', areaName, 'Changes:', changes);
  });
  ```

#### Superpowers.storage.off(eventName, callback)
- Purpose: Unregisters an event listener for storage events.
- Input: 
  - `eventName` (string) - The name of the event to stop listening for.
  - `callback` (function) - The function to remove from the event listeners.
- Returns: None
- Example:
  ```javascript
  const handleChange = (changes, areaName) => {
    console.log('Storage changed:', changes);
  };

  window.Superpowers.storage.on('onChanged', handleChange);
  // Later, to remove the listener:
  window.Superpowers.storage.off('onChanged', handleChange);
  ```

This API provides a robust interface for interacting with browser storage areas, supporting both synchronous and asynchronous operations, and enabling event-driven programming for storage changes.


### superaction
Type: Bridge  
Purpose: The "superaction" plugin acts as a bridge between a web page and a Chrome extension's service worker, enabling communication and interaction with the `chrome.action` API. It allows web pages to invoke `chrome.action` methods and listen for events from the extension.

### Public API

#### Superpowers.action.xxxMethod(...)
- Purpose: Dynamically invokes any method available on the `chrome.action` API from the web page context.
- Input: 
  - `methodName` (String): The name of the `chrome.action` method to be called.
  - `...args` (Array): Arguments to be passed to the specified `chrome.action` method.
- Returns: A Promise that resolves with the result of the `chrome.action` method call, or rejects with an error message if the call fails.
- Example:
  ```javascript
  // Example: Dynamically call the 'setBadgeText' method on chrome.action
  window.Superpowers.action.setBadgeText({ text: 'New' })
    .then(result => {
      console.log('Badge text set successfully:', result);
    })
    .catch(error => {
      console.error('Failed to set badge text:', error);
    });
  ```

#### Superpowers.action.on(eventName, callback)
- Purpose: Registers an event listener for events emitted by the `chrome.action` API.
- Input:
  - `eventName` (String): The name of the event to listen for (e.g., `onClicked`).
  - `callback` (Function): The function to be called when the event is triggered, receiving the event arguments.
- Returns: None.
- Example:
  ```javascript
  // Example: Listen for the 'onClicked' event on the action button
  window.Superpowers.action.on('onClicked', (tab) => {
    console.log('Action button clicked in tab:', tab);
  });
  ```

#### Superpowers.action.off(eventName, callback)
- Purpose: Unregisters a previously registered event listener for a specific event.
- Input:
  - `eventName` (String): The name of the event for which the listener should be removed.
  - `callback` (Function): The function that was originally registered as a listener.
- Returns: None.
- Example:
  ```javascript
  // Example: Remove the listener for the 'onClicked' event
  const handleClick = (tab) => {
    console.log('Action button clicked in tab:', tab);
  };

  window.Superpowers.action.on('onClicked', handleClick);
  // Later, remove the listener
  window.Superpowers.action.off('onClicked', handleClick);
  ```

This API provides a flexible mechanism for interacting with the `chrome.action` API directly from a web page, leveraging the power of Promises for asynchronous operations and event handling for real-time interactions.


### superasyncrandominteger
Type: Utility  
Purpose: Provides asynchronous generation of random integers within a specified range after a delay.

### Public API
#### Superpowers.asyncRandomInteger(timeMs, minVal, maxVal)
- Purpose: Generates a random integer asynchronously within the specified range `[minVal, maxVal]` after a delay of `timeMs` milliseconds.
- Input:
  - `timeMs` (Number): The delay in milliseconds before the random integer is generated.
  - `minVal` (Number): The minimum value of the range (inclusive).
  - `maxVal` (Number): The maximum value of the range (inclusive).
- Returns: A `Promise` that resolves with the generated random integer or rejects with an error message if the operation fails.
- Example:
  ```javascript
  // Example usage of Superpowers.asyncRandomInteger
  window.Superpowers.asyncRandomInteger(1000, 1, 100)
    .then((randomInt) => {
      console.log(`Generated random integer: ${randomInt}`);
    })
    .catch((error) => {
      console.error(`Error generating random integer: ${error}`);
    });
  ```

This method is ideal for scenarios where non-blocking random number generation is required, allowing other operations to proceed while awaiting the result.


### ga
Type: Bridge  
Purpose: Facilitates interaction with Google Analytics APIs through a content script and service worker, enabling OAuth authentication and data retrieval.

### Public API

#### Superpowers.Ga.login(...)
- Purpose: Authenticates the user by loading Google Analytics OAuth credentials and verifying them through the Admin API.
- Input: `customCreds` (optional) - An object containing custom service, clientSecretType, and tokenType.
- Returns: A promise that resolves with an object containing a success message if login is verified.
- Example:
  ```javascript
  window.Superpowers.Ga.login().then(response => {
    console.log(response.message);
  }).catch(error => {
    console.error("Login failed:", error);
  });
  ```

#### Superpowers.Ga.getLoginStatus()
- Purpose: Checks if the user is currently authenticated with valid credentials.
- Input: None
- Returns: A promise that resolves with a boolean indicating the login status.
- Example:
  ```javascript
  window.Superpowers.Ga.getLoginStatus().then(isLoggedIn => {
    console.log("Logged in:", isLoggedIn);
  });
  ```

#### Superpowers.Ga.test()
- Purpose: A test method that attempts to log in with default credentials to verify connectivity and authentication.
- Input: None
- Returns: A promise that resolves with the login verification result.
- Example:
  ```javascript
  window.Superpowers.Ga.test().then(response => {
    console.log("Test successful:", response);
  }).catch(error => {
    console.error("Test failed:", error);
  });
  ```

#### Superpowers.Ga.listAccounts()
- Purpose: Retrieves a list of Google Analytics accounts accessible to the user.
- Input: None
- Returns: A promise that resolves with the list of accounts.
- Example:
  ```javascript
  window.Superpowers.Ga.listAccounts().then(accounts => {
    console.log("Accounts:", accounts);
  }).catch(error => {
    console.error("Error listing accounts:", error);
  });
  ```

#### Superpowers.Ga.listAccountSummaries()
- Purpose: Retrieves summaries of all accounts accessible to the user.
- Input: None
- Returns: A promise that resolves with the account summaries.
- Example:
  ```javascript
  window.Superpowers.Ga.listAccountSummaries().then(summaries => {
    console.log("Account Summaries:", summaries);
  }).catch(error => {
    console.error("Error listing account summaries:", error);
  });
  ```

#### Superpowers.Ga.listProperties(accountId, pageSize, pageToken)
- Purpose: Lists properties for a specified account.
- Input: 
  - `accountId` (string): The ID of the account.
  - `pageSize` (optional, number): The maximum number of results to return.
  - `pageToken` (optional, string): The token for the next page of results.
- Returns: A promise that resolves with the properties list.
- Example:
  ```javascript
  window.Superpowers.Ga.listProperties("1234").then(properties => {
    console.log("Properties:", properties);
  }).catch(error => {
    console.error("Error listing properties:", error);
  });
  ```

#### Superpowers.Ga.runReport(propertyName, body)
- Purpose: Executes a report query for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The report request body.
- Returns: A promise that resolves with the report results.
- Example:
  ```javascript
  const reportBody = { /* report request details */ };
  window.Superpowers.Ga.runReport("properties/1234", reportBody).then(report => {
    console.log("Report:", report);
  }).catch(error => {
    console.error("Error running report:", error);
  });
  ```

#### Superpowers.Ga.runPivotReport(propertyName, body)
- Purpose: Executes a pivot report query for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The pivot report request body.
- Returns: A promise that resolves with the pivot report results.
- Example:
  ```javascript
  const pivotReportBody = { /* pivot report request details */ };
  window.Superpowers.Ga.runPivotReport("properties/1234", pivotReportBody).then(report => {
    console.log("Pivot Report:", report);
  }).catch(error => {
    console.error("Error running pivot report:", error);
  });
  ```

#### Superpowers.Ga.batchRunReports(propertyName, body)
- Purpose: Executes multiple report queries in a batch for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The batch report request body.
- Returns: A promise that resolves with the batch report results.
- Example:
  ```javascript
  const batchReportBody = { /* batch report request details */ };
  window.Superpowers.Ga.batchRunReports("properties/1234", batchReportBody).then(reports => {
    console.log("Batch Reports:", reports);
  }).catch(error => {
    console.error("Error running batch reports:", error);
  });
  ```

#### Superpowers.Ga.batchRunPivotReports(propertyName, body)
- Purpose: Executes multiple pivot report queries in a batch for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The batch pivot report request body.
- Returns: A promise that resolves with the batch pivot report results.
- Example:
  ```javascript
  const batchPivotReportBody = { /* batch pivot report request details */ };
  window.Superpowers.Ga.batchRunPivotReports("properties/1234", batchPivotReportBody).then(reports => {
    console.log("Batch Pivot Reports:", reports);
  }).catch(error => {
    console.error("Error running batch pivot reports:", error);
  });
  ```

#### Superpowers.Ga.runRealtimeReport(propertyName, body)
- Purpose: Executes a real-time report query for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The real-time report request body.
- Returns: A promise that resolves with the real-time report results.
- Example:
  ```javascript
  const realtimeReportBody = { /* real-time report request details */ };
  window.Superpowers.Ga.runRealtimeReport("properties/1234", realtimeReportBody).then(report => {
    console.log("Real-time Report:", report);
  }).catch(error => {
    console.error("Error running real-time report:", error);
  });
  ```

#### Superpowers.Ga.getMetadata(name)
- Purpose: Retrieves metadata for a specified property.
- Input: `name` (string) - The name of the property.
- Returns: A promise that resolves with the metadata.
- Example:
  ```javascript
  window.Superpowers.Ga.getMetadata("properties/1234").then(metadata => {
    console.log("Metadata:", metadata);
  }).catch(error => {
    console.error("Error getting metadata:", error);
  });
  ```

#### Superpowers.Ga.checkCompatibility(propertyName, body)
- Purpose: Checks compatibility of a report for a specified property.
- Input:
  - `propertyName` (string): The name of the property.
  - `body` (object): The compatibility check request body.
- Returns: A promise that resolves with the compatibility check results.
- Example:
  ```javascript
  const compatibilityBody = { /* compatibility request details */ };
  window.Superpowers.Ga.checkCompatibility("properties/1234", compatibilityBody).then(result => {
    console.log("Compatibility Check:", result);
  }).catch(error => {
    console.error("Error checking compatibility:", error);
  });
  ```

#### Superpowers.Ga.createAudienceExport(parent, audienceExportBody)
- Purpose: Creates an audience export for a specified parent.
- Input:
  - `parent` (string): The parent resource name.
  - `audienceExportBody` (object): The audience export request body.
- Returns: A promise that resolves with the created audience export.
- Example:
  ```javascript
  const audienceExportBody = { /* audience export request details */ };
  window.Superpowers.Ga.createAudienceExport("properties/1234", audienceExportBody).then(export => {
    console.log("Audience Export Created:", export);
  }).catch(error => {
    console.error("Error creating audience export:", error);
  });
  ```


### gsc
Type: Utility  
Purpose: Facilitates interaction with the Google Search Console (GSC) API, enabling operations such as site management, search analytics, sitemap handling, and URL inspection through a structured JavaScript interface.

### Public API

#### Superpowers.Gsc.login(customCreds)
- Purpose: Initiates a login process to Google Search Console using OAuth credentials.
- Input: 
  - `customCreds` (Object): Optional. Contains custom credential parameters.
- Returns: A Promise that resolves with an object indicating success or throws an error if the login fails.
- Example:
  ```javascript
  window.Superpowers.Gsc.login({ service: "my-service" })
    .then(response => console.log(response.message))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getLoginStatus()
- Purpose: Retrieves the current login status to determine if the user is authenticated with GSC.
- Input: None
- Returns: A promise that resolves with a boolean indicating the login status.
- Example:
  ```javascript
  window.Superpowers.Gsc.getLoginStatus().then(isLoggedIn => {
    console.log(`Logged in: ${isLoggedIn}`);
  });
  ```

#### Superpowers.Gsc.listSites()
- Purpose: Lists all sites associated with the authenticated GSC account.
- Input: None
- Returns: A Promise that resolves with an array of site information or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.listSites()
    .then(sites => console.log(sites))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getSiteInfo(siteUrl)
- Purpose: Retrieves detailed information about a specific site.
- Input:
  - `siteUrl` (String): The URL of the site to retrieve information for.
- Returns: A Promise that resolves with the site information or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.getSiteInfo("https://example.com")
    .then(siteInfo => console.log(siteInfo))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.querySearchAnalytics(siteUrl, queryBody)
- Purpose: Executes a search analytics query for a specified site.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `queryBody` (Object): The query parameters, including date range and dimensions.
- Returns: A Promise that resolves with the query results or rejects with an error.
- Example:
  ```javascript
  const queryBody = {
    startDate: "2023-01-01",
    endDate: "2023-01-31",
    dimensions: ["query"]
  };
  window.Superpowers.Gsc.querySearchAnalytics("https://example.com", queryBody)
    .then(results => console.log(results))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.submitSitemap(siteUrl, sitemapUrl)
- Purpose: Submits a sitemap to a specified site.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `sitemapUrl` (String): The URL of the sitemap.
- Returns: A Promise that resolves when the sitemap is submitted or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.submitSitemap("https://example.com", "https://example.com/sitemap.xml")
    .then(() => console.log("Sitemap submitted successfully"))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.deleteSitemap(siteUrl, sitemapUrl)
- Purpose: Deletes a specified sitemap from a site.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `sitemapUrl` (String): The URL of the sitemap.
- Returns: A Promise that resolves when the sitemap is deleted or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.deleteSitemap("https://example.com", "https://example.com/sitemap.xml")
    .then(() => console.log("Sitemap deleted successfully"))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.listSitemaps(siteUrl)
- Purpose: Lists all sitemaps for a specified site.
- Input:
  - `siteUrl` (String): The URL of the site.
- Returns: A Promise that resolves with a list of sitemaps or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.listSitemaps("https://example.com")
    .then(sitemaps => console.log(sitemaps))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.inspectUrl(siteUrl, inspectionUrl, languageCode)
- Purpose: Inspects a URL for issues and retrieves its status.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `inspectionUrl` (String): The URL to inspect.
  - `languageCode` (String): Optional. The language code for the inspection (default is 'en-US').
- Returns: A Promise that resolves with the inspection results or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.Gsc.inspectUrl("https://example.com", "https://example.com/page")
    .then(results => console.log(results))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getRichResults(siteUrl, pageUrl)
- Purpose: Retrieves rich results information for a specific page.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `pageUrl` (String): The URL of the page.
- Returns: A Promise that resolves with the rich results data or null if not available.
- Example:
  ```javascript
  window.Superpowers.Gsc.getRichResults("https://example.com", "https://example.com/page")
    .then(richResults => console.log(richResults))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getAmpStatus(siteUrl, pageUrl)
- Purpose: Retrieves AMP status for a specific page.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `pageUrl` (String): The URL of the page.
- Returns: A Promise that resolves with the AMP status data or null if not available.
- Example:
  ```javascript
  window.Superpowers.Gsc.getAmpStatus("https://example.com", "https://example.com/page")
    .then(ampStatus => console.log(ampStatus))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getMobileUsability(siteUrl, pageUrl)
- Purpose: Retrieves mobile usability information for a specific page.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `pageUrl` (String): The URL of the page.
- Returns: A Promise that resolves with the mobile usability data or null if not available.
- Example:
  ```javascript
  window.Superpowers.Gsc.getMobileUsability("https://example.com", "https://example.com/page")
    .then(mobileUsability => console.log(mobileUsability))
    .catch(error => console.error(error.message));
  ```

#### Superpowers.Gsc.getSearchAnalyticsByFilter(siteUrl, options)
- Purpose: Retrieves search analytics data with enhanced filtering options.
- Input:
  - `siteUrl` (String): The URL of the site.
  - `options` (Object): Contains filtering options such as date range, dimensions, and filters.
- Returns: A Promise that resolves with the analytics data or rejects with an error.
- Example:
  ```javascript
  const options = {
    startDate: "2023-01-01",
    endDate: "2023-01-31",
    dimensions: ["query", "page"],
    filters: [{ dimension: "device", operator: "equals", expression: "mobile" }]
  };
  window.Superpowers.Gsc.getSearchAnalyticsByFilter("https://example.com", options)
    .then(data => console.log(data))
    .catch(error => console.error(error.message));
  ```

This documentation provides a comprehensive guide to the methods available in the `window.Superpowers.Gsc` namespace, allowing developers to effectively interact with Google Search Console through the gsc plugin.


### superdebug
Type: Utility  
Purpose: Provides enhanced debugging capabilities for web applications by capturing and relaying log messages from the page context to a background script and optionally displaying them in a side panel or appending them to the DOM.

### Public API
#### Superpowers.debugLog(msg, level = "info", domElementOrSelector)
- Purpose: Logs messages with a specified severity level, optionally displays them in a designated DOM element, and relays them to the background script for further processing or display in a side panel.
- Input:  
  - `msg` (any): The message or object to be logged. It will be converted to a string for display.
  - `level` (string, optional): The severity level of the log message. Accepts "info", "warn", "warning", "error", and "debug". Defaults to "info".
  - `domElementOrSelector` (HTMLElement|string, optional): A DOM element or a CSS selector string where the log message should be appended. If not provided, the message will only be logged to the console and relayed to the background script.
- Returns: None.
- Example:
  ```javascript
  // Log a simple message with default level "info"
  Superpowers.debugLog("Application started");

  // Log an error message
  Superpowers.debugLog("An error occurred", "error");

  // Log a warning message and append it to a DOM element with ID 'logContainer'
  Superpowers.debugLog("This is a warning", "warn", "#logContainer");

  // Log a complex object and append it to a specific DOM element
  const user = { id: 1, name: "John Doe", role: "admin" };
  Superpowers.debugLog(user, "debug", document.getElementById("userLog"));
  ```

This method provides a versatile way to handle logging in web applications, ensuring that developers can capture detailed information about application behavior and errors, both in the console and visually within the application UI.


### superconsoleintercept
Type: Utility  
Purpose: The `superconsoleintercept` plugin intercepts console events in a web page and facilitates communication between the page, content script, and service worker, enabling enhanced logging and monitoring capabilities across different contexts.

### Public API

#### Superpowers.console.on(level, callback)
- Purpose: Registers a callback function to be executed whenever a console event of the specified level occurs.
- Input: 
  - `level` (string): The console method level to listen for (e.g., "log", "info", "warn", "error").
  - `callback` (function): The function to be called with the console arguments when the event occurs.
- Returns: None
- Example:
  ```javascript
  Superpowers.console.on("warn", (message) => {
    alert("Warning detected: " + message);
  });
  ```

#### Superpowers.console.off(level, callback)
- Purpose: Unregisters a previously registered callback for a specific console level.
- Input:
  - `level` (string): The console method level to stop listening for.
  - `callback` (function): The callback function to be removed.
- Returns: None
- Example:
  ```javascript
  const myCallback = (message) => console.log("Info:", message);
  Superpowers.console.on("info", myCallback);
  // Later, to remove the callback:
  Superpowers.console.off("info", myCallback);
  ```

#### Superpowers.console.onAll(callback)
- Purpose: Registers a callback function to be executed for all console event levels.
- Input:
  - `callback` (function): The function to be called with the console arguments for any console event.
- Returns: None
- Example:
  ```javascript
  Superpowers.console.onAll((level, message) => {
    console.log(`[${level.toUpperCase()}]: ${message}`);
  });
  ```

#### Superpowers.console.turnOn()
- Purpose: Activates the console interception, overriding the original console methods to enable event broadcasting.
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnOn();
  console.log("This will be intercepted and broadcasted.");
  ```

#### Superpowers.console.turnOff()
- Purpose: Deactivates the console interception, restoring the original console methods.
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnOff();
  console.log("This will not be intercepted.");
  ```

#### Superpowers.console.turnTransmissionOn()
- Purpose: Enables the transmission of console events to other contexts (e.g., content script, service worker).
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnTransmissionOn();
  ```

#### Superpowers.console.turnTransmissionOff()
- Purpose: Disables the transmission of console events, stopping them from being forwarded to other contexts.
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnTransmissionOff();
  ```

This API provides a robust interface for intercepting and managing console events across different contexts, enhancing the logging and monitoring capabilities of web applications.


### superdebugger
Type: Utility  
Purpose: The `superdebugger` plugin provides a robust interface for interacting with the `chrome.debugger` API, facilitating debugging tasks within Chrome extensions. It includes comprehensive error handling and state management to ensure reliable communication between the page, content script, and service worker.

### Public API

#### Superpowers.debugger.on(eventName, callback)
- Purpose: Registers an event listener for debugger events.
- Input: 
  - `eventName` (string): The name of the event to listen for. Supported events include `onDetach` and `onEvent`.
  - `callback` (function): The function to be executed when the event is triggered. The callback receives event arguments.
- Returns: None
- Example:
  ```javascript
  // Listen for 'onDetach' event
  window.Superpowers.debugger.on('onDetach', (source, reason) => {
    console.log('Debugger detached from:', source, 'Reason:', reason);
  });
  ```

#### Superpowers.debugger.off(eventName, callback)
- Purpose: Unregisters an event listener for debugger events.
- Input: 
  - `eventName` (string): The name of the event to stop listening for.
  - `callback` (function): The function that was previously registered as a listener.
- Returns: None
- Example:
  ```javascript
  // Remove listener for 'onEvent' event
  const handleEvent = (debuggeeId, message, params) => {
    console.log('Debugger event:', message, 'Params:', params);
  };

  window.Superpowers.debugger.on('onEvent', handleEvent);
  window.Superpowers.debugger.off('onEvent', handleEvent);
  ```

#### Superpowers.debugger.xxxMethod(...)
- Purpose: Calls a method on the `chrome.debugger` API.
- Input: 
  - `methodName` (string): The name of the `chrome.debugger` method to call. Supported methods include `attach`, `detach`, `sendCommand`, and `getTargets`.
  - `args` (array): Arguments to pass to the `chrome.debugger` method.
- Returns: A Promise that resolves with the result of the method call or rejects with an error message.
- Example:
  ```javascript
  // Attach debugger to a tab with ID 123 and specify the protocol version
  window.Superpowers.debugger.attach({ tabId: 123 }, '1.3')
    .then(() => {
      console.log('Debugger attached successfully');
    })
    .catch(error => {
      console.error('Failed to attach debugger:', error);
    });

  // Send a command to retrieve all targets
  window.Superpowers.debugger.sendCommand({ tabId: 123 }, 'Target.getTargets')
    .then(targets => {
      console.log('Targets:', targets);
    })
    .catch(error => {
      console.error('Failed to get targets:', error);
    });
  ```

This API offers a comprehensive interface for managing debugging sessions and interacting with the `chrome.debugger` API, providing developers with the tools necessary to perform advanced debugging tasks within their extensions.


### superopenai
Type: Utility  
Purpose: The "superopenai" plugin provides a bridge to interact with the OpenAI API from a web page context. It facilitates various AI operations such as chat completions, image generation, audio processing, and more, including support for streaming responses.

### Public API

#### Superpowers.OpenAI.test(...)
- Purpose: To test the connection and setup of the superopenai plugin.
- Input: None
- Returns: A promise that resolves with a success message if the test is successful.
- Example:
  ```javascript
  window.Superpowers.OpenAI.test().then(result => {
    console.log("Test success:", result);
  }).catch(error => {
    console.error("Test failed:", error);
  });
  ```

#### Superpowers.OpenAI.chatCompletion(...)
- Purpose: To get a chat completion from the OpenAI API.
- Input: An object with properties such as `model` and `messages`.
- Returns: A promise that resolves with the chat completion result.
- Example:
  ```javascript
  window.Superpowers.OpenAI.chatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello, how are you?" }]
  }).then(result => {
    console.log("Chat completion:", result);
  }).catch(error => {
    console.error("Chat completion failed:", error);
  });
  ```

#### Superpowers.OpenAI.chatCompletionStream(...)
- Purpose: To stream chat completions from the OpenAI API, receiving partial results as they are generated.
- Input: An object with properties such as `model` and `messages`.
- Returns: A promise that resolves when the stream ends, providing the final result.
- Example:
  ```javascript
  window.Superpowers.OpenAI.chatCompletionStream({
    model: "gpt-4",
    messages: [{ role: "user", content: "Tell me a story." }]
  }).then(result => {
    console.log("Stream completed:", result);
  }).catch(error => {
    console.error("Streaming failed:", error);
  });
  ```

#### Superpowers.OpenAI.imageGeneration(...)
- Purpose: To generate images based on a given prompt.
- Input: An object with properties such as `model`, `prompt`, `n`, and `size`.
- Returns: A promise that resolves with the generated image data.
- Example:
  ```javascript
  window.Superpowers.OpenAI.imageGeneration({
    prompt: "A futuristic cityscape",
    n: 1,
    size: "1024x1024"
  }).then(result => {
    console.log("Generated image:", result);
  }).catch(error => {
    console.error("Image generation failed:", error);
  });
  ```

#### Superpowers.OpenAI.setApiKey(...)
- Purpose: To set the API key for authenticating with the OpenAI API.
- Input: A string representing the API key.
- Returns: A promise that resolves when the API key is set successfully.
- Example:
  ```javascript
  window.Superpowers.OpenAI.setApiKey("your-api-key-here").then(() => {
    console.log("API key set successfully.");
  }).catch(error => {
    console.error("Failed to set API key:", error);
  });
  ```

#### Superpowers.OpenAI.setOrganizationId(...)
- Purpose: To set the organization ID for the OpenAI API requests.
- Input: A string representing the organization ID.
- Returns: A promise that resolves when the organization ID is set successfully.
- Example:
  ```javascript
  window.Superpowers.OpenAI.setOrganizationId("your-org-id-here").then(() => {
    console.log("Organization ID set successfully.");
  }).catch(error => {
    console.error("Failed to set organization ID:", error);
  });
  ```

#### Superpowers.OpenAI.audioSpeech(...)
- Purpose: To convert text to speech using the OpenAI API.
- Input: An object with properties such as `model`, `input`, `voice`, and `response_format`.
- Returns: A promise that resolves with the audio data.
- Example:
  ```javascript
  window.Superpowers.OpenAI.audioSpeech({
    input: "Hello, world!",
    voice: "alloy"
  }).then(audioData => {
    console.log("Audio data:", audioData);
  }).catch(error => {
    console.error("Audio speech failed:", error);
  });
  ```

#### Superpowers.OpenAI.embeddings(...)
- Purpose: To generate embeddings for a given input using the OpenAI API.
- Input: An object with properties such as `model` and `input`.
- Returns: A promise that resolves with the embeddings data.
- Example:
  ```javascript
  window.Superpowers.OpenAI.embeddings({
    input: "OpenAI is a leader in AI research."
  }).then(embeddings => {
    console.log("Embeddings:", embeddings);
  }).catch(error => {
    console.error("Embeddings generation failed:", error);
  });
  ```

#### Superpowers.OpenAI.fileUpload(...)
- Purpose: To upload a file to the OpenAI API for purposes such as fine-tuning.
- Input: An object with properties such as `file` and `purpose`.
- Returns: A promise that resolves with the upload result.
- Example:
  ```javascript
  const file = new File(["content"], "example.txt");
  window.Superpowers.OpenAI.fileUpload({
    file: file,
    purpose: "fine-tune"
  }).then(result => {
    console.log("File uploaded:", result);
  }).catch(error => {
    console.error("File upload failed:", error);
  });
  ```

#### Superpowers.OpenAI.modelList(...)
- Purpose: To list available models from the OpenAI API.
- Input: None
- Returns: A promise that resolves with the list of models.
- Example:
  ```javascript
  window.Superpowers.OpenAI.modelList().then(models => {
    console.log("Available models:", models);
  }).catch(error => {
    console.error("Failed to list models:", error);
  });
  ```

This documentation provides a comprehensive overview of the primary methods available through the `superopenai` plugin, ensuring developers can effectively integrate and utilize OpenAI's capabilities within their web applications.


### superpages
Type: Utility  
Purpose: Facilitates the creation of downloadable content blobs directly from web pages, enabling the generation and retrieval of blob URLs for content, such as HTML or other MIME types, within a Chrome extension environment.

### Public API
#### Superpowers.pages(content, options)
- Purpose: To generate a downloadable blob URL for the provided content, allowing web pages to create downloadable files without server-side processing.
- Input:
  - `content` (String): The content to be converted into a downloadable blob.
  - `options` (Object, optional): Configuration options for the blob creation.
    - `filename` (String, optional): Suggested filename for the download.
    - `mimeType` (String, optional): MIME type of the content. Defaults to "text/html" if not specified.
- Returns: A Promise that resolves with the blob URL if the operation is successful, or rejects with an error message if it fails.
- Example:
  ```javascript
  // Example usage of Superpowers.pages to create a downloadable HTML file
  const htmlContent = "<html><body><h1>Hello, World!</h1></body></html>";
  const options = { filename: "hello.html", mimeType: "text/html" };

  window.Superpowers.pages(htmlContent, options)
    .then((blobUrl) => {
      // Create a link to download the blob
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = options.filename || "download.html";
      downloadLink.textContent = "Download File";

      // Append the link to the body
      document.body.appendChild(downloadLink);
    })
    .catch((error) => {
      console.error("Failed to create blob:", error);
    });
  ```
This example demonstrates how to use the `Superpowers.pages` method to convert HTML content into a downloadable file, providing a seamless client-side solution for generating downloadable content.


### superpingasync
Type: Utility  
Purpose: Provides an asynchronous mechanism to send a "ping" message from a web page to a browser extension and receive a "pong" response.

### Public API
#### Superpowers.asyncPing(message)
- Purpose: Sends a message to the browser extension and receives a response asynchronously.
- Input: 
  - `message` (String): The message to be sent to the extension.
- Returns: 
  - A `Promise` that resolves with the response from the extension. The response is a string prefixed with "Pong: ". If an error occurs, the promise is rejected with an error message.
- Example:
  ```javascript
  window.Superpowers.asyncPing("Hello, extension!")
    .then(response => {
      console.log(response); // Output: "Pong: Hello, extension!"
    })
    .catch(error => {
      console.error("Error:", error);
    });
  ```

This API is designed to facilitate communication between a web page and a browser extension using a simple message-passing mechanism. The `asyncPing` method is particularly useful for scenarios where you need to perform an operation in the extension and handle the result back in the page context.


### superfetch
Type: Utility  
Purpose: Provides an enhanced fetch API that operates through a background extension, allowing for extended capabilities such as timeout management and enhanced response handling.

### Public API

#### Superpowers.setSuperfetchTimeout(ms)
- Purpose: Sets the timeout duration for superfetch requests.
- Input: 
  - `ms` (Number): The timeout duration in milliseconds.
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.setSuperfetchTimeout(15000); // Sets timeout to 15 seconds
  ```

#### Superpowers.whatsGoingOn()
- Purpose: Retrieves the list of currently active superfetch requests.
- Input: None
- Returns: Array of active request objects, each containing `requestId`, `url`, and `startTime`.
- Example:
  ```javascript
  const activeRequests = window.Superpowers.whatsGoingOn();
  console.log(activeRequests);
  ```

#### Superpowers.fetch(url, options)
- Purpose: Performs a fetch request with enhanced capabilities, including timeout management and detailed response handling.
- Input:
  - `url` (String): The URL to fetch.
  - `options` (Object, optional): Fetch options such as method, headers, body, etc.
- Returns: Promise that resolves to a `superResponse` object with extended properties and methods.
- Example:
  ```javascript
  window.Superpowers.fetch('https://api.example.com/data')
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Network response was not ok.');
    })
    .then(data => {
      console.log('Data received:', data);
    })
    .catch(error => {
      console.error('Fetch error:', error);
    });
  ```

### superResponse Object
- Properties:
  - `status` (Number): HTTP status code.
  - `statusText` (String): HTTP status text.
  - `ok` (Boolean): True if the status is in the range 200-299.
  - `redirected` (Boolean): True if the request was redirected.
  - `url` (String): Final URL after any redirects.
  - `type` (String): Type of response.
  - `headers` (Object): Response headers.
- Methods:
  - `text()`: Returns a promise that resolves with the response body as text.
  - `json()`: Returns a promise that resolves with the response body parsed as JSON.
  - `blob()`: Returns a promise that resolves with the response body as a Blob.
  - `arrayBuffer()`: Returns a promise that resolves with the response body as an ArrayBuffer.
  - `getHeadersObject()`: Returns the headers as an object.
- Extras:
  - `_superfetch`: Contains additional metadata such as `requestId`, `timestamp`, `rawHeaders`, `rawBody`, and `performance` metrics.


### superping
Type: Utility  
Purpose: Provides a simple mechanism to send synchronous "ping" messages from a web page to a service worker via a content script, primarily for logging or echo purposes without expecting a response.

### Public API
#### Superpowers.ping(msg)
- Purpose: Sends a "ping" message from the web page to the service worker and immediately returns the same message. This function allows for logging or echoing messages without waiting for a response.
- Input: 
  - `msg` (String): The message to be sent and logged.
- Returns: 
  - (String): The same `msg` that was passed as input.
- Example:
  ```javascript
  // Usage of Superpowers.ping to send a message and receive it back immediately
  const message = "Hello, Superping!";
  const response = window.Superpowers.ping(message);
  console.log(response); // Outputs: "Hello, Superping!"
  ```

This API is designed to be used in scenarios where a quick, synchronous "ping" is required, and the actual processing or response handling is not necessary from the page's perspective.


### superreadme
Type: Bridge  
Purpose: Provides access to specific README files from a Chrome extension, allowing web pages to retrieve and display documentation content directly from the extension's context.

### Public API

#### Superpowers.readme.getLLMReadme()
- Purpose: Retrieves the content of the `README-LLM.md` file from the extension.
- Input: None
- Returns: A Promise that resolves with the content of the `README-LLM.md` file as a string. If an error occurs, the promise is rejected with an error message.
- Example:
  ```javascript
  window.Superpowers.readme.getLLMReadme()
    .then(content => {
      console.log("LLM Readme Content:", content);
    })
    .catch(error => {
      console.error("Failed to retrieve LLM Readme:", error);
    });
  ```

#### Superpowers.readme.getMainReadme()
- Purpose: Retrieves the content of the `README.md` file from the extension.
- Input: None
- Returns: A Promise that resolves with the content of the `README.md` file as a string. If an error occurs, the promise is rejected with an error message.
- Example:
  ```javascript
  window.Superpowers.readme.getMainReadme()
    .then(content => {
      console.log("Main Readme Content:", content);
    })
    .catch(error => {
      console.error("Failed to retrieve Main Readme:", error);
    });
  ```

This API allows developers to programmatically access and utilize the documentation content embedded within a Chrome extension, facilitating dynamic content display and integration into web applications.


### superscreenshot
Type: Utility  
Purpose: The superscreenshot plugin provides a mechanism to capture screenshots of web pages or specific browser tabs. It supports capturing visible or full-page screenshots, with options for image format, quality, and additional customization like CSS/JS injection.

### Public API
#### Superpowers.screenshot(...)
- Purpose: Captures a screenshot based on the provided configuration and returns it as a data URL.
- Input: 
  - `payload` (Object): Configuration object with the following optional properties:
    - `url` (string): The URL to open for the screenshot. Required if `tabId` is not provided.
    - `tabId` (number): The tab ID to capture. Required if `url` is not provided.
    - `captureMode` (string): Capture mode, either `"visible"` for the current viewport or `"full"` for the entire page. Defaults to `"visible"`.
    - `format` (string): Image format, either `"png"` or `"jpeg"`. Defaults to `"png"`.
    - `quality` (number): Image quality (0-100) for JPEG format. Ignored if format is PNG. Defaults to 100.
    - `delayMs` (number): Delay in milliseconds before capture to allow dynamic content to render. Defaults to 1000 ms.
    - `keepTabOpen` (boolean): If true, the tab or window created for the screenshot is not closed after capture. Defaults to false.
    - `width` (number): Desired window width if creating a new window.
    - `height` (number): Desired window height if creating a new window.
    - `injectCss` (string): CSS string to inject into the page before capture.
    - `injectJs` (string): JavaScript string to inject and execute on the page before capture.
- Returns: 
  - `Promise<string>`: Resolves with a data URL string representing the screenshot image. Rejects with an error message if the operation fails.
- Example:
  ```javascript
  // Capture a full-page screenshot of a specific URL
  window.Superpowers.screenshot({
    url: "https://example.com",
    captureMode: "full",
    format: "jpeg",
    quality: 80,
    delayMs: 2000,
    injectCss: "body { background-color: lightgray; }",
    injectJs: "document.body.style.border = '5px solid red';"
  })
  .then(dataUrl => {
    console.log("Screenshot captured:", dataUrl);
    // You can use the data URL to display the image or save it
  })
  .catch(error => {
    console.error("Screenshot failed:", error);
  });
  ```

This documentation provides a comprehensive guide to using the `Superpowers.screenshot` method, ensuring developers can effectively integrate and utilize the superscreenshot plugin in their applications.


### superruntime
Type: Utility  
Purpose: The superruntime plugin provides a bridge to interact with Chrome's runtime API from web pages, enabling dynamic control and event handling within browser extensions.

### Public API

#### Superpowers.runtime.turnOn()
- Purpose: Enables the superruntime functionality, allowing communication between the web page and the background script.
- Input: None
- Returns: `undefined`
- Example:
  ```javascript
  window.Superpowers.runtime.turnOn();
  ```

#### Superpowers.runtime.turnOff()
- Purpose: Disables the superruntime functionality, halting communication between the web page and the background script.
- Input: None
- Returns: `undefined`
- Example:
  ```javascript
  window.Superpowers.runtime.turnOff();
  ```

#### Superpowers.runtime.on(eventName, callback)
- Purpose: Registers a callback to be executed when a specified runtime event occurs.
- Input: 
  - `eventName` (string): The name of the event to listen for.
  - `callback` (function): The function to execute when the event is triggered.
- Returns: `undefined`
- Example:
  ```javascript
  window.Superpowers.runtime.on('onInstalled', (details) => {
    console.log('Extension installed:', details);
  });
  ```

#### Superpowers.runtime.off(eventName, callback)
- Purpose: Unregisters a previously registered callback for a specified runtime event.
- Input:
  - `eventName` (string): The name of the event to stop listening for.
  - `callback` (function): The function to remove from the event's callback list.
- Returns: `undefined`
- Example:
  ```javascript
  const myCallback = (details) => console.log('Extension installed:', details);
  window.Superpowers.runtime.on('onInstalled', myCallback);
  window.Superpowers.runtime.off('onInstalled', myCallback);
  ```

#### Superpowers.runtime.xxxMethod(...)
- Purpose: Dynamically calls a method on the Chrome runtime API.
- Input:
  - `methodName` (string): The name of the Chrome runtime method to call.
  - `args` (array): Arguments to pass to the Chrome runtime method.
- Returns: A `Promise` that resolves with the result of the method call or rejects with an error.
- Example:
  ```javascript
  window.Superpowers.runtime.getBackgroundPage().then(backgroundPage => {
    console.log('Background page:', backgroundPage);
  }).catch(error => {
    console.error('Error calling method:', error);
  });
  ```

This documentation provides a comprehensive guide to using the `window.Superpowers.runtime` methods available in the superruntime plugin, enabling seamless integration with Chrome's runtime API.


### superenv
Type: Utility  
Purpose: The `superenv` plugin provides a mechanism to manage environment variables within a browser extension context. It allows for retrieving, proposing, and managing multiple sets of environment variables, facilitating dynamic configuration management for web applications.

### Public API

#### Superpowers.getEnvVars()
- Purpose: Retrieves the current set of environment variables.
- Input: None
- Returns: A Promise that resolves to an object containing the current environment variables.
- Example:
  ```javascript
  window.Superpowers.getEnvVars().then(vars => {
      console.log("Current environment variables:", vars);
  }).catch(error => {
      console.error("Failed to retrieve environment variables:", error);
  });
  ```

#### Superpowers.setEnvVars()
- Purpose: Deprecated method for setting environment variables. Logs a warning and indicates that this functionality is restricted to the extension sidepanel.
- Input: None
- Returns: A Promise that resolves to an object indicating failure and the reason.
- Example:
  ```javascript
  window.Superpowers.setEnvVars().then(response => {
      console.warn(response.error);
  });
  ```

#### Superpowers.proposeVars(name, description)
- Purpose: Proposes a new environment variable with a name and description. If the variable does not exist, it is created with an empty value and the description is stored.
- Input:
  - `name` (string): The name of the environment variable.
  - `description` (string): A description of the environment variable.
- Returns: A Promise that resolves with an object indicating success or failure.
- Example:
  ```javascript
  window.Superpowers.proposeVars("NEW_VAR", "Description of the new variable").then(response => {
      console.log("Variable proposed:", response);
  }).catch(error => {
      console.error("Failed to propose variable:", error);
  });
  ```

#### Superpowers.listEnvSets()
- Purpose: Lists all available environment variable sets.
- Input: None
- Returns: A Promise that resolves to an object containing all environment variable sets.
- Example:
  ```javascript
  window.Superpowers.listEnvSets().then(envSets => {
      console.log("Available environment sets:", envSets);
  }).catch(error => {
      console.error("Failed to list environment sets:", error);
  });
  ```

#### Superpowers.getEnvSet(envName)
- Purpose: Retrieves a specific set of environment variables by name.
- Input: `envName` (string) - The name of the environment set to retrieve.
- Returns: A Promise that resolves to an object containing the specified environment variables set.
- Example:
  ```javascript
  window.Superpowers.getEnvSet("production").then(vars => {
      console.log("Production environment variables:", vars);
  }).catch(error => {
      console.error("Failed to retrieve environment set:", error);
  });
  ```

#### Superpowers.setEnvSet(envName, varsObj)
- Purpose: Sets or updates a specific environment variable set with the provided variables.
- Input: 
  - `envName` (string) - The name of the environment set to update.
  - `varsObj` (object) - An object containing key-value pairs of environment variables.
- Returns: A Promise that resolves to an object indicating success.
- Example:
  ```javascript
  const newVars = { API_URL: "https://api.example.com", DEBUG_MODE: "false" };
  window.Superpowers.setEnvSet("production", newVars).then(response => {
      console.log("Environment set updated:", response);
  }).catch(error => {
      console.error("Failed to set environment set:", error);
  });
  ```

#### Superpowers.deleteEnvSet(envName)
- Purpose: Deletes a specified environment variable set, except the default set.
- Input: `envName` (string) - The name of the environment set to delete.
- Returns: A Promise that resolves to an object indicating success or failure.
- Example:
  ```javascript
  window.Superpowers.deleteEnvSet("staging").then(response => {
      console.log("Environment set deleted:", response);
  }).catch(error => {
      console.error("Failed to delete environment set:", error);
  });
  ```

#### Superpowers.debugLog(message, level, source)
- Purpose: Logs a debug message with a specified level and source, both locally and to the content script.
- Input:
  - `message` (string) - The debug message to log.
  - `level` (string, optional) - The severity level of the log (default: "info").
  - `source` (string, optional) - The source of the log message (default: "page").
- Returns: None
- Example:
  ```javascript
  window.Superpowers.debugLog("This is a debug message", "warn", "custom-source");
  ```

This documentation provides a comprehensive guide to using the `superenv` plugin's public API, ensuring developers can effectively manage environment variables within their web applications.


### supersidepanel
Type: Bridge  
Purpose: Facilitates communication between in-page scripts and the Chrome sidePanel API through a content script and service worker, enabling seamless integration and control of the side panel features within web applications.

### Public API
#### Superpowers.sidePanel.open(options)
- Purpose: Opens the Chrome side panel with specified options.
- Input: `options` (Object) - Configuration options for opening the side panel.
- Returns: `Promise<void>` - Resolves when the panel is successfully opened.
- Example:
  ```javascript
  window.Superpowers.sidePanel.open({ url: "https://example.com" })
    .then(() => console.log("Side panel opened successfully"))
    .catch((error) => console.error("Failed to open side panel:", error));
  ```

#### Superpowers.sidePanel.setOptions(options)
- Purpose: Sets configuration options for the Chrome side panel.
- Input: `options` (Object) - New configuration settings for the side panel.
- Returns: `Promise<void>` - Resolves when options are successfully set.
- Example:
  ```javascript
  window.Superpowers.sidePanel.setOptions({ width: 400 })
    .then(() => console.log("Options set successfully"))
    .catch((error) => console.error("Failed to set options:", error));
  ```

#### Superpowers.sidePanel.getOptions()
- Purpose: Retrieves the current configuration options of the Chrome side panel.
- Input: None
- Returns: `Promise<Object>` - Resolves with the current options of the side panel.
- Example:
  ```javascript
  window.Superpowers.sidePanel.getOptions()
    .then((options) => console.log("Current options:", options))
    .catch((error) => console.error("Failed to get options:", error));
  ```

#### Superpowers.sidePanel.setPanelBehavior(behavior)
- Purpose: Sets the behavior of the Chrome side panel.
- Input: `behavior` (Object) - Defines the behavior settings for the side panel.
- Returns: `Promise<void>` - Resolves when behavior is successfully set.
- Example:
  ```javascript
  window.Superpowers.sidePanel.setPanelBehavior({ autoHide: true })
    .then(() => console.log("Panel behavior set successfully"))
    .catch((error) => console.error("Failed to set panel behavior:", error));
  ```

#### Superpowers.sidePanel.getPanelBehavior()
- Purpose: Retrieves the current behavior settings of the Chrome side panel.
- Input: None
- Returns: `Promise<Object>` - Resolves with the current behavior settings of the side panel.
- Example:
  ```javascript
  window.Superpowers.sidePanel.getPanelBehavior()
    .then((behavior) => console.log("Current panel behavior:", behavior))
    .catch((error) => console.error("Failed to get panel behavior:", error));
  ```

#### Superpowers.sidePanel.on(eventName, callback)
- Purpose: Registers an event listener for future side panel events.
- Input: 
  - `eventName` (String) - The name of the event to listen for.
  - `callback` (Function) - The function to call when the event occurs.
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.sidePanel.on("customEvent", (data) => {
    console.log("Custom event received:", data);
  });
  ```

#### Superpowers.sidePanel.off(eventName, callback)
- Purpose: Unregisters an event listener for side panel events.
- Input: 
  - `eventName` (String) - The name of the event to stop listening for.
  - `callback` (Function) - The function to remove from the event listeners.
- Returns: `void`
- Example:
  ```javascript
  const handleCustomEvent = (data) => {
    console.log("Custom event received:", data);
  };

  window.Superpowers.sidePanel.on("customEvent", handleCustomEvent);
  // Later, to remove the listener:
  window.Superpowers.sidePanel.off("customEvent", handleCustomEvent);
  ```

This API provides a comprehensive interface for managing and interacting with the Chrome side panel, allowing developers to customize its behavior and appearance dynamically.


### superwebnavigation
Type: Utility  
Purpose: Provides a bridge between web pages and the Chrome `chrome.webNavigation` API, enabling interaction with and monitoring of web navigation events and methods from within web pages.

### Public API

#### Superpowers.webNavigation.on(eventName, callback)
- Purpose: Registers an event listener for specified web navigation events.
- Input:
  - `eventName` (string): The name of the web navigation event to listen for. Supported events include `onBeforeNavigate`, `onCommitted`, `onDOMContentLoaded`, `onCompleted`, and `onErrorOccurred`.
  - `callback` (function): The function to be executed when the event is triggered. The callback receives event details as arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.webNavigation.on('onCompleted', (details) => {
    console.log('Navigation completed:', details);
  });
  ```

#### Superpowers.webNavigation.off(eventName, callback)
- Purpose: Unregisters an event listener for specified web navigation events.
- Input:
  - `eventName` (string): The name of the web navigation event to stop listening for.
  - `callback` (function): The function that was previously registered as a listener for this event.
- Returns: `void`
- Example:
  ```javascript
  const onCompletedHandler = (details) => {
    console.log('Navigation completed:', details);
  };

  Superpowers.webNavigation.on('onCompleted', onCompletedHandler);
  // Later, to remove the listener:
  Superpowers.webNavigation.off('onCompleted', onCompletedHandler);
  ```

#### Superpowers.webNavigation.xxxMethod(...args)
- Purpose: Calls a method from the `chrome.webNavigation` API.
- Input:
  - `methodName` (string): The name of the `chrome.webNavigation` method to call.
  - `...args`: The arguments to pass to the `chrome.webNavigation` method.
- Returns: `Promise`: Resolves with the result of the method call, or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.webNavigation.getAllFrames({ tabId: 123 })
    .then((frames) => {
      console.log('All frames:', frames);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  ```

This API allows developers to interact with the `chrome.webNavigation` API seamlessly from within a web page, enabling the handling of navigation events and invoking navigation methods through a simple and consistent interface.


### supertabs
Type: Utility  
Purpose: The `supertabs` plugin provides a bridge to the Chrome `tabs` API, enabling direct method calls and event handling from a web page context. It facilitates communication between the page, content scripts, and service workers, allowing developers to interact with browser tabs seamlessly.

### Public API

#### Superpowers.tabs.query(...)
- Purpose: Queries all browser tabs that match the specified properties.
- Input: An object with properties to match against tabs (e.g., `{ active: true }`).
- Returns: A Promise that resolves to an array of tabs matching the query.
- Example:
  ```javascript
  Superpowers.tabs.query({ active: true }).then(tabs => {
    console.log("Active tabs:", tabs);
  }).catch(error => {
    console.error("Error querying tabs:", error);
  });
  ```

#### Superpowers.tabs.create(...)
- Purpose: Creates a new browser tab with the specified properties.
- Input: An object specifying tab properties (e.g., `{ url: "https://www.example.com" }`).
- Returns: A Promise that resolves to the created tab object.
- Example:
  ```javascript
  Superpowers.tabs.create({ url: "https://www.example.com" }).then(tab => {
    console.log("Created tab:", tab);
  }).catch(error => {
    console.error("Error creating tab:", error);
  });
  ```

#### Superpowers.tabs.reload(...)
- Purpose: Reloads a specified tab.
- Input: The tab ID to reload, and optionally an object with reload properties.
- Returns: A Promise that resolves when the tab has been reloaded.
- Example:
  ```javascript
  Superpowers.tabs.reload(123).then(() => {
    console.log("Tab reloaded.");
  }).catch(error => {
    console.error("Error reloading tab:", error);
  });
  ```

#### Superpowers.tabs.on(eventName, callback)
- Purpose: Attaches an event listener for tab events.
- Input: 
  - `eventName`: A string indicating the event to listen for (e.g., `"onCreated"`).
  - `callback`: A function to execute when the event is triggered.
- Returns: None.
- Example:
  ```javascript
  Superpowers.tabs.on("onCreated", (tab) => {
    console.log("Tab created:", tab);
  });
  ```

#### Superpowers.tabs.off(eventName, callback)
- Purpose: Detaches a previously attached event listener.
- Input: 
  - `eventName`: A string indicating the event to stop listening for.
  - `callback`: The function that was used as the callback in `on`.
- Returns: None.
- Example:
  ```javascript
  const handleTabCreated = (tab) => {
    console.log("Tab created:", tab);
  };

  Superpowers.tabs.on("onCreated", handleTabCreated);
  Superpowers.tabs.off("onCreated", handleTabCreated);
  ```

This documentation provides a comprehensive guide to using the `supertabs` plugin's public API, ensuring seamless integration and interaction with browser tabs from a web page context.


### superurlget
Type: Utility  
Purpose: Provides methods to retrieve and manipulate web page content through various techniques, including rendering the page, extracting HTML, DOM, or text content.

### Public API

#### Superpowers.Urlget.getRenderedPage(url, config)
- Purpose: Retrieve the fully rendered HTML content, including any dynamically loaded content, of a specified URL.
- Input: 
  - `url` (string): The target URL to fetch the rendered content from.
  - `config` (object, optional): Configuration options such as `waitForEvent`, `timeoutMs`, `injectCss`, and `injectJs`.
- Returns: A Promise that resolves with an object containing the rendered page's `title`, `url`, `html`, and `text`.
- Example:
  ```javascript
  window.Superpowers.Urlget.getRenderedPage('https://example.com', { waitForEvent: 'load' })
    .then(result => {
      console.log('Page Title:', result.title);
      console.log('Page URL:', result.url);
      console.log('Page HTML:', result.html);
    })
    .catch(error => {
      console.error('Error fetching rendered page:', error);
    });
  ```

#### Superpowers.Urlget.getHtml(url, config)
- Purpose: Fetch the raw HTML content of a specified URL.
- Input:
  - `url` (string): The URL to fetch the HTML from.
  - `config` (object, optional): Configuration options for the request.
- Returns: A Promise that resolves with an object containing the `html` of the page.
- Example:
  ```javascript
  window.Superpowers.Urlget.getHtml('https://example.com')
    .then(result => {
      console.log('Page HTML:', result.html);
    })
    .catch(error => {
      console.error('Error fetching HTML:', error);
    });
  ```

#### Superpowers.Urlget.getDom(url, config)
- Purpose: Obtain the HTML content of a specified URL, similar to `getHtml`.
- Input:
  - `url` (string): The URL to fetch the HTML content from.
  - `config` (object, optional): Configuration options for the request.
- Returns: A Promise that resolves with an object containing the `html` of the page.
- Example:
  ```javascript
  window.Superpowers.Urlget.getDom('https://example.com')
    .then(result => {
      console.log('Page DOM HTML:', result.html);
    })
    .catch(error => {
      console.error('Error fetching DOM:', error);
    });
  ```

#### Superpowers.Urlget.getText(url, config)
- Purpose: Extract the text content from the body of a specified URL.
- Input:
  - `url` (string): The URL to extract text content from.
  - `config` (object, optional): Configuration options for the request.
- Returns: A Promise that resolves with an object containing the `text` extracted from the page.
- Example:
  ```javascript
  window.Superpowers.Urlget.getText('https://example.com')
    .then(result => {
      console.log('Page Text:', result.text);
    })
    .catch(error => {
      console.error('Error fetching text:', error);
    });
  ```

This API provides developers with robust methods to capture and manipulate web page content, supporting dynamic content rendering and extraction of various content types.


### superwebrequest
Type: Utility  
Purpose: Provides a bridge for handling and manipulating web requests within a browser extension, allowing for the interception, modification, and observation of network requests.

### Public API

#### Superpowers.webrequest.turnOn()
- Purpose: Enables the superwebrequest functionality, allowing it to intercept and handle web requests.
- Input: None
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.webrequest.turnOn();
  ```

#### Superpowers.webrequest.turnOff()
- Purpose: Disables the superwebrequest functionality, stopping it from intercepting and handling web requests.
- Input: None
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.webrequest.turnOff();
  ```

#### Superpowers.webrequest.on(eventName, callback)
- Purpose: Registers an event listener for specific web request events.
- Input: 
  - `eventName` (string): The name of the web request event to listen for (e.g., 'onBeforeRequest', 'onCompleted').
  - `callback` (function): The function to execute when the event occurs.
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.webrequest.on('onBeforeRequest', (details) => {
    console.log('Request intercepted:', details);
  });
  ```

#### Superpowers.webrequest.off(eventName, callback)
- Purpose: Unregisters an event listener for specific web request events.
- Input: 
  - `eventName` (string): The name of the web request event.
  - `callback` (function): The function to remove from the event's listener list.
- Returns: `void`
- Example:
  ```javascript
  const callback = (details) => {
    console.log('Request intercepted:', details);
  };
  window.Superpowers.webrequest.on('onBeforeRequest', callback);
  window.Superpowers.webrequest.off('onBeforeRequest', callback);
  ```

#### Superpowers.webrequest.xxxMethod(...)
- Purpose: Dynamically calls a method on the `chrome.webRequest` API.
- Input: 
  - `methodName` (string): The name of the method to call on `chrome.webRequest`.
  - `args` (array): Arguments to pass to the method.
- Returns: `Promise`: Resolves with the result of the method call, or rejects with an error message.
- Example:
  ```javascript
  window.Superpowers.webrequest.handlerBehaviorChanged()
    .then(() => {
      console.log('Handler behavior changed successfully');
    })
    .catch((error) => {
      console.error('Error changing handler behavior:', error);
    });
  ```

This documentation provides a comprehensive guide to using the `superwebrequest` plugin's public API, enabling developers to effectively manage and manipulate web requests within their browser extensions.

----
# Superpowers AI Assistant Example
----

This is a complete working example of an AI-powered Todo application using the Superpowers browser extension.

```html
<!DOCTYPE html>
<html>
<head>
  <title>Enhanced AI Todo Assistant</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash/4.17.21/lodash.min.js"></script>
  <style>
    :root {
      --primary-color: #0078D4;       /* Standard blue */
      --bg-color: #FFFFFF;            /* White background */
      --border-color: #CCCCCC;        /* Light grey borders */
      --text-color: #000000;          /* Black text */
      --container-bg: #F9F9F9;        /* Off-white container */
    }
    body { margin:0; padding:0; font-family:system-ui,-apple-system,sans-serif; background:var(--bg-color); color:var(--text-color); display:flex; flex-direction:column; min-height:100vh;}
    h1::after { content:" ✅"; }
    .container { padding:1rem; flex:1 1 auto; }
    .status { margin:8px 0; border-radius:4px; padding:8px; font-weight:500; }
    .status.error { background: #FDE7E9; color: #C42B1C; }
    .status.success { background: #DFF6DD; color: #107C10; }
    .debug-panel { margin-top:1rem; padding:1rem; background: #F3F3F3; color: #333333; border-radius:6px; display:none; max-height:300px; overflow-y:auto; font-family:monospace; }
    table { width:100%; border-collapse:collapse; }
    thead { background: #F0F0F0; }
    th,td { border:1px solid var(--border-color); padding:8px; }
    .todo-row.completed { opacity:0.7; background: #F3F3F3; }
    .priority-high { border-left: 6px solid #C42B1C; }
    .priority-medium { border-left: 6px solid #FFB900; }
    .priority-low { border-left: 6px solid #107C10; }
    .chat-area { border:1px solid var(--border-color); border-radius:6px; padding:1rem; height:200px; overflow-y:auto; margin-top:1rem; background:var(--container-bg);}
    .message { margin:8px 0; padding:8px; border-radius:4px; max-width:80%;}
    .user { background: #E8F1FB; margin-left:auto; }
    .assistant { background: #F3F3F3; margin-right:auto; }
    .thinking { font-style:italic; color: #605E5C; }
    .thinking::before { content:"🤔 "; }
    /* Sticky bar at bottom for chat input */
    .chat-input-bar { position:fixed; bottom:0; left:0; right:0; background: #FFFFFF; border-top: 1px solid #CCCCCC; padding:8px; z-index:9999; display:flex; align-items:center; gap:8px;}
    .chat-input-bar select { padding:8px; border:1px solid #ccc; border-radius:4px; flex:0 1 auto; }
    /* Widen #chat-message to 60%: */
    .chat-input-bar #chat-message {
      padding:8px; 
      border:1px solid #ccc; 
      border-radius:4px;
      flex:0 1 60%;
    }
    .chat-input-bar button { padding:8px 16px; background:var(--primary-color); color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:600;}
    .chat-input-bar button:hover { opacity:0.9; }
    .chat-input-bar button:disabled { opacity:0.5; cursor:not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Todo Assistant</h1>
    <div id="status-area"></div>
    <div id="debug-panel" class="debug-panel"></div>

    <table>
      <thead>
        <tr><th>Done</th><th>Text</th><th>Priority / Due</th><th>Actions</th></tr>
      </thead>
      <tbody id="todo-list"></tbody>
    </table>

    <div class="chat-area" id="chat-area"></div>
  </div>

  <div class="chat-input-bar">
    <select id="modelSelect">
      <option value="o1-mini">o1-mini</option>
      <option value="o1-preview">o1-preview</option>
      <option value="gpt-4o" selected>gpt-4o</option>
      <option value="gpt-4o-mini">gpt-4o-mini</option>
    </select>
    <input type="text" id="chat-message" placeholder="Chat with your AI assistant..." />
    <button id="send-button">Send 🏁</button>
  </div>

<script>
/*
  NOTE: This code uses "Structured Outputs" from OpenAI.
  We must strictly define what actions are allowed.

  Valid ACTIONS: 
   - "ADD"
   - "EDIT"
   - "DELETE"
   - "TOGGLE"
   - "UPDATE"

  "UPDATE" can be used by the assistant to do batch updates on the tasks,
  e.g. marking them all completed.

  The system prompt below instructs the AI to only respond with these actions
  and a single "message" field. 
*/

// Minimal snippet to wait for Superpowers injection:
function waitForSuperpowers() {
  return new Promise(resolve => {
    if(window.Superpowers) return resolve();
    const check=setInterval(()=>{
      if(window.Superpowers){
        clearInterval(check);
        resolve();
      }
    },100);
  });
}

// MODEL CONFIGS
const modelConfigs = {
  'o1-mini':{maxTokens:65536,temperature:1},
  'o1-preview':{maxTokens:32768,temperature:1},
  'gpt-4o':{maxTokens:16384,temperature:0.7},
  'gpt-4o-mini':{maxTokens:16384,temperature:0.7},
};
const MIN_TOKENS = 16384;
let currentModel = 'gpt-4o';

// STATE
let todos = [];
let chatHistory = [];
let debugMode = false;
let isProcessing = false;

// LOG FUNCTION FOR DEBUG OUTPUT
const log = (typ,msg,data=null)=>{
  let ts = new Date().toISOString();
  let full = `[${ts}] [${typ.toUpperCase()}] ${msg}`;
  console.log(full, data||'');
  if(debugMode){
    let d = document.getElementById('debug-panel');
    d.style.display='block';
    d.innerHTML += `<div>${full}</div>`;
    if(data) d.innerHTML += `<pre>${JSON.stringify(data,null,2)}</pre>`;
    d.scrollTop = d.scrollHeight;
  }
};

// MIN TOKEN ENFORCEMENT
function getModelCfg(k){
  let c = modelConfigs[k]||modelConfigs['gpt-4o'];
  if(c.maxTokens < MIN_TOKENS){
    log('warn',`Model ${k} had < ${MIN_TOKENS} tokens, forcing ${MIN_TOKENS}`);
    c.maxTokens = MIN_TOKENS;
  }
  return c;
}

// SHOW/REMOVE STATUS
const showStatus=(m,t)=>{
  let s=document.getElementById('status-area');
  s.innerHTML = `<div class="status ${t}">${m}</div>`;
  setTimeout(()=>{s.innerHTML='';},5000);
};

/*
  parseAIJSON():
  We do a quick parse in case the model puts triple backticks or some extra text.
  If something fails, we fallback to a default parse with empty data.
*/
const parseAIJSON = (raw)=>{
  let cleaned = raw.replace(/```/g,'').trim();
  try { return JSON.parse(cleaned); } catch(e){}
  let first = cleaned.indexOf('{'), last = cleaned.lastIndexOf('}');
  if(first===-1 || last===-1 || last<first) return {actions:[],message:'Invalid JSON. Please re-try.'};
  let sub = cleaned.slice(first,last+1);
  try { return JSON.parse(sub); } catch(e){}
  return {actions:[],message:'Invalid JSON. Please re-try.'};
};

// ADAPT ACTION: unify possible AI keys into consistent data structure
function adaptAction(a){
  // If "add" was returned as an object, interpret as "ADD"
  if(a.add) return {type:'ADD',...a.add};
  if(a.action){
    return {
      type:a.action.toUpperCase(),
      id:a.id,
      text:a.text,
      priority:a.priority,
      dueDate:a.dueDate,
      items:a.items  // for UPDATE
    };
  }
  return a;
}

// RENDER TODOS
function renderTodos(){
  log('ui','Rendering todos...');
  let tb = document.getElementById('todo-list');
  tb.innerHTML='';
  todos.forEach((td,i)=>{
    let tr=document.createElement('tr');
    tr.className=`todo-row ${td.completed?'completed':''} ${td.priority?'priority-'+td.priority:''}`;
    tr.innerHTML=`
      <td><input type="checkbox" onchange="toggleTodo(${i})"/></td>
      <td></td>
      <td></td>
      <td>
        <button onclick="editTodo(${i})">✍️ Edit</button>
        <button onclick="deleteTodo(${i})">🗑️ Delete</button>
      </td>`;
    tb.appendChild(tr);
    let c=tr.querySelector('input[type=checkbox]');
    c.checked = !!td.completed;
    let cells=tr.querySelectorAll('td');
    cells[1].textContent = td.text||'';
    cells[2].textContent = ((td.priority||'')+(td.dueDate?(' | '+td.dueDate):''));
  });
}

// RENDER CHAT
function renderChat(){
  let area = document.getElementById('chat-area');
  area.innerHTML = chatHistory.map(m=>`<div class="message ${m.role}">${m.content}</div>`).join('');
  area.scrollTop = area.scrollHeight;
}

// STORAGE
const loadTodos=async()=>{
  log('storage','Loading...');
  try{
    let s = await Superpowers.storage.local.get('todos');
    todos = s.todos || [];
    renderTodos();
    log('storage','Todos loaded',todos);
  } catch(e){
    log('error','Load fail', e);
    showStatus('Failed to load','error');
  }
};

const saveTodos=async()=>{
  log('storage','Saving', todos);
  try{
    await Superpowers.storage.local.set({todos});
    renderTodos();
    log('storage','Saved todos');
  } catch(e){
    log('error','Save error', e);
    showStatus('Failed to save','error');
  }
};

// BASIC TODO OPS
window.addTodo=async()=>{
  let inp=document.getElementById('new-todo');
  let v=inp.value.trim();
  if(!v) return;
  todos.push({
    id:Date.now(),
    text:v,
    completed:false,
    priority:'medium',
    created:new Date().toISOString()
  });
  await saveTodos();
  inp.value='';
};

window.toggleTodo=async (i)=>{
  todos[i].completed = !todos[i].completed; 
  todos[i].modifiedAt = new Date().toISOString();
  await saveTodos();
};

window.deleteTodo=async (i)=>{
  todos.splice(i,1);
  await saveTodos();
};

window.editTodo=async (i)=>{
  let n = prompt('Edit todo:',todos[i].text);
  if(n && n.trim()){
    todos[i].text = n.trim();
    todos[i].modifiedAt = new Date().toISOString();
    await saveTodos();
  }
};

/*
  We'll define a minimal JSON schema for the structured output:

  The top-level object must have:
  {
    "actions": [ {type: "ADD"|"EDIT"|"DELETE"|"TOGGLE"|"UPDATE", ...}, ... ],
    "message": "..."
  }

  For example:
    {
      "actions": [
        {"type":"ADD", "text":"Buy groceries", "priority":"medium", "dueDate":"2025-02-01"},
        {"type":"TOGGLE", "id":123456 }
      ],
      "message": "Here is your updated list!"
    }

  If we want to do batch updates:
  {
    "actions": [
      {"type":"UPDATE", "items": [ {id:123, completed:true}, {id:456, completed:false} ] }
    ],
    "message":"OK done!"
  }
*/
const structuredSchema = {
  strict: true,
  schema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: {
          type: "object",
          // We enforce known keys:
          properties: {
            type: {
              type: "string",
              enum: ["ADD","EDIT","DELETE","TOGGLE","UPDATE"]
            },
            id: { type: ["number","null","string"] },
            text: { type: ["string","null"] },
            priority: { type: ["string","null"] },
            dueDate: { type: ["string","null"] },
            items: {
              type: ["array","null"],
              items: {
                type: "object",
                properties: {
                  id: { type: ["number","string"] },
                  completed: { type: "boolean" }
                },
                required: ["id","completed"],
                additionalProperties: false
              }
            }
          },
          required: ["type"], // must at least have 'type'
          additionalProperties: false
        }
      },
      message: { type: "string" }
    },
    required: ["actions","message"],
    additionalProperties: false
  }
};

function showThinking(){  
  let c=document.getElementById('chat-area');
  let d=document.createElement('div');
  d.className='message assistant thinking';
  d.id='thinking'; 
  d.textContent='Thinking...';
  c.appendChild(d); 
}
function hideThinking(){
  let t=document.getElementById('thinking');
  if(t) t.remove();
}

// AI Chat
async function sendChat(){
  if(isProcessing) return;
  let inp=document.getElementById('chat-message');
  let m=inp.value.trim();
  if(!m) return;
  log('chat','Send msg', m);
  isProcessing = true; 
  document.getElementById('send-button').disabled = true;
  chatHistory.push({role:'user',content:m});
  renderChat();
  inp.value='';

  try{
    showThinking();
    let c = getModelCfg(currentModel);

    // System prompt: instruct the model to use only the valid actions and the required format
    // with "actions" array + "message" key. 
    // "response_format.type = 'json_schema'" => Strict structured outputs
    let r=await Superpowers.OpenAI.chatCompletion({
      model: currentModel,
      messages:[
        {
          role:'system',
          content:`You are a helpful todo assistant. Current todos: ${JSON.stringify(todos,null,2)}.

IMPORTANT: You must only respond with a valid JSON object that strictly follows the schema with:
{
  "actions": [...],
  "message": "..."
}

Each action "type" must be one of: "ADD", "EDIT", "DELETE", "TOGGLE", "UPDATE". 
No other fields or keys are allowed. 
For "UPDATE", you can provide "items":[{id, completed:true|false},...] to do batch changes. 
For "ADD", you can provide "text", "priority", "dueDate". 
For "EDIT", must have "id", can have "text", "priority", "dueDate". 
For "TOGGLE", must have "id". 
For "DELETE", must have "id". 

Do not produce any 'todos' field or other extra keys. 
Do not produce code fences. Output only valid JSON strictly.`
        },
        ...chatHistory
      ],
      response_format: {
        type: "json_schema",
        json_schema: structuredSchema
      },
      max_completion_tokens: c.maxTokens,
      temperature: c.temperature
    });

    hideThinking();
    log('ai','Raw AI', r);

    // If there's a refusal property, handle it
    if(r.choices[0].message.refusal){
      let refusalMsg = r.choices[0].message.refusal;
      log('warn','Assistant refused', refusalMsg);
      chatHistory.push({role:'assistant', content:refusalMsg});
      renderChat();
      return;
    }

    // Otherwise parse from the "parsed" field
    if(r.choices[0].message.parsed){
      let structuredResult = r.choices[0].message.parsed;
      log('action','Parsed AI (structuredOutputs)', structuredResult);

      // handle each action
      if(Array.isArray(structuredResult.actions)){
        for(let a of structuredResult.actions){
          let x=adaptAction(a);
          await handleAIAction(x);
        }
      }
      // Then the assistant's message
      chatHistory.push({role:'assistant',content:structuredResult.message||'(No message)'});
      renderChat();

    } else {
      // fallback: if there's no parsed data or an error
      let fallbackContent = r.choices[0].message.content || '(No structured content)';
      let parsedObj = parseAIJSON(fallbackContent);
      if(parsedObj.actions){
        for(let a of parsedObj.actions){
          let x=adaptAction(a);
          await handleAIAction(x);
        }
      }
      chatHistory.push({role:'assistant',content:parsedObj.message||fallbackContent});
      renderChat();
    }

  }catch(e){
    log('error','Chat err',e);
    hideThinking();
    chatHistory.push({role:'assistant',content:'Error processing request.'});
    renderChat();
    showStatus('Error','error');
  }finally{
    isProcessing=false; 
    document.getElementById('send-button').disabled=false;
  }
}

// Handle each recognized action
async function handleAIAction(ac){
  log('action','Handle',ac);
  let {type,id,text,priority,dueDate,items} = ac;

  if(type==='ADD'){
    todos.push({
      id:Date.now(),
      text:text||'Untitled',
      completed:false,
      priority:priority||'medium',
      dueDate:dueDate||null,
      created:new Date().toISOString()
    });
  } else if(type==='EDIT'){
    let i = todos.findIndex(t=>t.id===id);
    if(i>-1){
      if(text) todos[i].text=text;
      if(priority) todos[i].priority=priority;
      if(dueDate) todos[i].dueDate=dueDate;
      todos[i].modifiedAt=new Date().toISOString();
    }
  } else if(type==='DELETE'){
    todos = todos.filter(t=>t.id!==id);
  } else if(type==='TOGGLE'){
    let it = todos.find(t=>t.id===id);
    if(it){
      it.completed=!it.completed;
      it.modifiedAt=new Date().toISOString();
    }
  } else if(type==='UPDATE'){
    // Example: multiple items to update
    if(Array.isArray(items)){
      for(let obj of items){
        // each obj has {id, completed}
        let idx = todos.findIndex(t=>t.id===obj.id);
        if(idx>-1){
          todos[idx].completed = obj.completed;
          todos[idx].modifiedAt=new Date().toISOString();
        }
      }
    }
  }
  await saveTodos();
}

// MODEL SELECT
document.getElementById('modelSelect').addEventListener('change', e=>{
  currentModel = e.target.value;
  log('model',`Switched to ${currentModel}`);
});

// DEBUG
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.shiftKey && e.key==='D'){
    debugMode=!debugMode;
    document.getElementById('debug-panel').style.display=debugMode?'block':'none';
    log('debug',`Debug=${debugMode}`);
  }
});

// WAIT FOR SUPERPOWERS + INIT
(async()=>{
  // Wait for extension injection:
  await (function waitForSuperpowers(){
    return new Promise(resolve=>{
      if(window.Superpowers) return resolve();
      let check=setInterval(()=>{
        if(window.Superpowers){
          clearInterval(check);
          resolve();
        }
      },100);
    });
  })();
  log('init','Superpowers is ready!');

  log('init','Startup...');
  try{
    document.getElementById('modelSelect').value = currentModel;
    let c=getModelCfg(currentModel);
    log('model',`Using ${currentModel} => maxTok=${c.maxTokens},temp=${c.temperature}`);
    // Quick check to see if we can contact the OpenAI plugin:
    await Superpowers.OpenAI.test();
    showStatus('AI assistant ready','success');
  } catch(e){
    log('error','Key invalid',e);
    showStatus('Set API key','error');
    // If sidePanel is available, we can open it so user can set the key:
    if(Superpowers.sidePanel && Superpowers.sidePanel.open) {
      Superpowers.sidePanel.open();
    }
  }
  await loadTodos();
  if(!todos.length){
    todos.push({
      id:Date.now(),
      text:'Welcome! Ask AI to manage your todos',
      completed:false,
      priority:'medium',
      created:new Date().toISOString()
    });
    await saveTodos();
  }
  log('init','Started ok');
})();

// SEND BUTTON + ENTER KEY
document.getElementById('send-button').addEventListener('click',sendChat);
document.getElementById('chat-message').addEventListener('keypress', e=>{
  if(e.key==='Enter') sendChat();
});
</script>
</body>
</html>

```

_Generated from source on 2025-01-28T12:03:33.839Z_

----
## Final Notes
----

1. Above is the newly generated plugin documentation.
2. The old Readme-LLM.md (if any) is archived in `Documentation/Archive/`.
3. Happy coding with Superpowers! 
