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

### superaction
Type: Bridge
Purpose: Facilitates communication between a web page and a Chrome extension's service worker, specifically for interacting with `chrome.action` API methods and handling related events.

### Public API
#### Superpowers.action.xxxMethod(...)
- Purpose: Dynamically invoke methods on the `chrome.action` API from a web page context.
- Input: 
  - `methodName` (string): The name of the `chrome.action` method to call.
  - `...args` (array): Arguments to pass to the specified `chrome.action` method.
- Returns: A `Promise` that resolves with the result of the `chrome.action` method call or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.action.setBadgeText({ text: "New" })
    .then(result => console.log("Badge text set successfully:", result))
    .catch(error => console.error("Failed to set badge text:", error));
  ```

#### Superpowers.action.on(eventName, callback)
- Purpose: Register an event listener for specific events emitted by the `chrome.action` API.
- Input:
  - `eventName` (string): The name of the event to listen for (e.g., "onClicked").
  - `callback` (function): The function to execute when the event is triggered. It receives event-specific arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.action.on("onClicked", (tab) => {
    console.log("Action button clicked in tab:", tab);
  });
  ```

#### Superpowers.action.off(eventName, callback)
- Purpose: Unregister a previously registered event listener for a specific event.
- Input:
  - `eventName` (string): The name of the event for which the listener should be removed.
  - `callback` (function): The callback function to remove.
- Returns: `void`
- Example:
  ```javascript
  function handleClick(tab) {
    console.log("Action button clicked in tab:", tab);
  }
  
  Superpowers.action.on("onClicked", handleClick);
  // Later, to remove the listener:
  Superpowers.action.off("onClicked", handleClick);
  ```
### storage
Type: Bridge
Purpose: The "storage" plugin facilitates communication between web page scripts and the Chrome extension's storage API, allowing for asynchronous storage operations and event handling.

### Public API

#### Superpowers.storage.local.get(...)
- Purpose: Retrieve items from the local storage area.
- Input: 
  - `keys` (string | array | object): A single key, array of keys, or object specifying default values.
- Returns: A Promise that resolves with the retrieved items as an object.
- Example:
  ```javascript
  Superpowers.storage.local.get('key').then(data => {
    console.log(data);
  }).catch(err => {
    console.error(err);
  });
  ```

#### Superpowers.storage.local.set(...)
- Purpose: Store items in the local storage area.
- Input: 
  - `items` (object): An object containing key-value pairs to store.
- Returns: A Promise that resolves when the items are stored.
- Example:
  ```javascript
  Superpowers.storage.local.set({ key: 'value' }).then(() => {
    console.log('Data saved');
  }).catch(err => {
    console.error(err);
  });
  ```

#### Superpowers.storage.local.remove(...)
- Purpose: Remove items from the local storage area.
- Input: 
  - `keys` (string | array): A single key or array of keys to remove.
- Returns: A Promise that resolves when the items are removed.
- Example:
  ```javascript
  Superpowers.storage.local.remove('key').then(() => {
    console.log('Data removed');
  }).catch(err => {
    console.error(err);
  });
  ```

#### Superpowers.storage.local.clear(...)
- Purpose: Clear all items from the local storage area.
- Input: None
- Returns: A Promise that resolves when the storage is cleared.
- Example:
  ```javascript
  Superpowers.storage.local.clear().then(() => {
    console.log('Storage cleared');
  }).catch(err => {
    console.error(err);
  });
  ```

#### Superpowers.storage.on(eventName, callback)
- Purpose: Register an event listener for storage changes.
- Input:
  - `eventName` (string): The name of the event to listen for (e.g., "onChanged").
  - `callback` (function): The function to call when the event occurs.
- Returns: None
- Example:
  ```javascript
  Superpowers.storage.on('onChanged', (changes, areaName) => {
    console.log('Storage changed:', changes, areaName);
  });
  ```

#### Superpowers.storage.off(eventName, callback)
- Purpose: Unregister an event listener for storage changes.
- Input:
  - `eventName` (string): The name of the event to stop listening for.
  - `callback` (function): The function to remove from the event listeners.
- Returns: None
- Example:
  ```javascript
  const handleChange = (changes, areaName) => {
    console.log('Storage changed:', changes, areaName);
  };

  Superpowers.storage.on('onChanged', handleChange);
  Superpowers.storage.off('onChanged', handleChange);
  ```

*Note: The methods `get`, `set`, `remove`, and `clear` are also available for other storage areas such as `sync`, `managed`, and `session` by replacing `local` with the respective area name.*
### superasyncrandominteger
Type: Utility
Purpose: Provides an asynchronous method to generate a random integer within a specified range after a specified delay.

### Public API
#### Superpowers.asyncRandomInteger(timeMs, minVal, maxVal)
- Purpose: 
  - To asynchronously generate a random integer between `minVal` and `maxVal` after a delay of `timeMs` milliseconds.
- Input:
  - `timeMs` (Number): The delay in milliseconds before the random integer is generated.
  - `minVal` (Number): The minimum value of the range (inclusive).
  - `maxVal` (Number): The maximum value of the range (inclusive).
- Returns:
  - A Promise that resolves to a random integer between `minVal` and `maxVal` after the specified delay.
  - The Promise is rejected if an error occurs during the process.
- Example:
  ```javascript
  window.Superpowers.asyncRandomInteger(1000, 1, 10)
    .then((randomInt) => {
      console.log(`Generated random integer: ${randomInt}`);
    })
    .catch((error) => {
      console.error(`Error generating random integer: ${error}`);
    });
  ```

This method utilizes a message-passing architecture between the page, content script, and background script to achieve asynchronous behavior.
### superdebug
Type: Utility  
Purpose: The superdebug plugin provides enhanced debugging capabilities by allowing developers to log messages with different severity levels, append logs to the DOM, and relay logs to a background process for further inspection or persistence.

### Public API
#### Superpowers.debugLog(msg, level = "info", domElementOrSelector)
- Purpose:  
  The `debugLog` method is used to log messages with various severity levels. It outputs logs to the console, optionally appends them to a specified DOM element, and sends them to a background process for further handling.

- Input:  
  - `msg`: (Any) The message or object to be logged. This will be converted to a string representation.
  - `level`: (String, optional) The severity level of the log. Accepted values are "info", "warn", "warning", "error", and "debug". Defaults to "info".
  - `domElementOrSelector`: (HTMLElement | String, optional) A DOM element or a CSS selector string where the log should be appended. If not provided, the log will not be appended to the DOM.

- Returns:  
  - None

- Example:
  ```javascript
  // Log an informational message
  window.Superpowers.debugLog("This is an info message");

  // Log a warning message and append it to a specific DOM element
  window.Superpowers.debugLog("This is a warning", "warn", "#logContainer");

  // Log an error with an object and append it to a DOM element
  window.Superpowers.debugLog({ error: "Something went wrong" }, "error", document.getElementById("errorLog"));
  ```
### ga
Type: Bridge
Purpose: Facilitates interaction with Google Analytics Data API by providing a bridge between web pages and the service worker for OAuth authentication and API requests.

### Public API
#### Superpowers.Ga.login(customCreds)
- Purpose: Authenticates and verifies Google Analytics credentials.
- Input: `customCreds` (Object) - Optional custom credentials, including service and token types.
- Returns: Promise resolving to an object with success status and message.
- Example:
  ```javascript
  Superpowers.Ga.login({ service: "custom-service" }).then(response => console.log(response));
  ```

#### Superpowers.Ga.getLoginStatus()
- Purpose: Retrieves the current login status.
- Input: None
- Returns: Promise resolving to a boolean indicating login status.
- Example:
  ```javascript
  Superpowers.Ga.getLoginStatus().then(status => console.log("Logged in:", status));
  ```

#### Superpowers.Ga.test()
- Purpose: Tests the login process using default credentials.
- Input: None
- Returns: Promise resolving to the result of the login attempt.
- Example:
  ```javascript
  Superpowers.Ga.test().then(response => console.log(response));
  ```

#### Superpowers.Ga.runReport(propertyName, body)
- Purpose: Executes a standard GA report.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The RunReportRequest schema.
- Returns: Promise resolving to the report data.
- Example:
  ```javascript
  Superpowers.Ga.runReport("properties/1234", { dimensions: [], metrics: [] }).then(data => console.log(data));
  ```

#### Superpowers.Ga.runPivotReport(propertyName, body)
- Purpose: Executes a pivot GA report.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The RunPivotReportRequest schema.
- Returns: Promise resolving to the pivot report data.
- Example:
  ```javascript
  Superpowers.Ga.runPivotReport("properties/1234", { pivot: {}, metrics: [] }).then(data => console.log(data));
  ```

#### Superpowers.Ga.batchRunReports(propertyName, body)
- Purpose: Executes multiple GA reports in batch.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The BatchRunReportsRequest schema.
- Returns: Promise resolving to the batch report data.
- Example:
  ```javascript
  Superpowers.Ga.batchRunReports("properties/1234", { requests: [] }).then(data => console.log(data));
  ```

#### Superpowers.Ga.batchRunPivotReports(propertyName, body)
- Purpose: Executes multiple pivot GA reports in batch.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The BatchRunPivotReportsRequest schema.
- Returns: Promise resolving to the batch pivot report data.
- Example:
  ```javascript
  Superpowers.Ga.batchRunPivotReports("properties/1234", { requests: [] }).then(data => console.log(data));
  ```

#### Superpowers.Ga.runRealtimeReport(propertyName, body)
- Purpose: Executes a real-time GA report.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The RunRealtimeReportRequest schema.
- Returns: Promise resolving to the real-time report data.
- Example:
  ```javascript
  Superpowers.Ga.runRealtimeReport("properties/1234", { dimensions: [], metrics: [] }).then(data => console.log(data));
  ```

#### Superpowers.Ga.getMetadata(name)
- Purpose: Retrieves metadata for a specified GA property.
- Input: `name` (String) - The metadata identifier, e.g., "properties/0".
- Returns: Promise resolving to the metadata.
- Example:
  ```javascript
  Superpowers.Ga.getMetadata("properties/0").then(metadata => console.log(metadata));
  ```

#### Superpowers.Ga.checkCompatibility(propertyName, body)
- Purpose: Checks compatibility of a report request with a GA property.
- Input: 
  - `propertyName` (String) - The GA property identifier.
  - `body` (Object) - The request body.
- Returns: Promise resolving to the compatibility results.
- Example:
  ```javascript
  Superpowers.Ga.checkCompatibility("properties/1234", { dimensions: [], metrics: [] }).then(result => console.log(result));
  ```

#### Superpowers.Ga.createAudienceExport(parent, audienceExportBody)
- Purpose: Creates an audience export for a specified GA property.
- Input: 
  - `parent` (String) - The GA property identifier.
  - `audienceExportBody` (Object) - The audience export request body.
- Returns: Promise resolving to the created audience export.
- Example:
  ```javascript
  Superpowers.Ga.createAudienceExport("properties/1234", { audience: {} }).then(export => console.log(export));
  ```

#### Superpowers.Ga.getAudienceExport(name)
- Purpose: Retrieves a specific audience export.
- Input: `name` (String) - The audience export identifier.
- Returns: Promise resolving to the audience export data.
- Example:
  ```javascript
  Superpowers.Ga.getAudienceExport("properties/1234/audienceExports/5678").then(data => console.log(data));
  ```

#### Superpowers.Ga.queryAudienceExport(name, queryBody)
- Purpose: Queries a specific audience export.
- Input: 
  - `name` (String) - The audience export identifier.
  - `queryBody` (Object) - The query request body.
- Returns: Promise resolving to the query results.
- Example:
  ```javascript
  Superpowers.Ga.queryAudienceExport("properties/1234/audienceExports/5678", { query: {} }).then(result => console.log(result));
  ```

#### Superpowers.Ga.listAudienceExports(parent, pageSize, pageToken)
- Purpose: Lists audience exports for a specified GA property.
- Input: 
  - `parent` (String) - The GA property identifier.
  - `pageSize` (Number) - Optional, number of results per page.
  - `pageToken` (String) - Optional, token for pagination.
- Returns: Promise resolving to the list of audience exports.
- Example:
  ```javascript
  Superpowers.Ga.listAudienceExports("properties/1234", 10).then(exports => console.log(exports));
  ```
### superdebugger
Type: Utility
Purpose: Provides a bridge for interacting with the Chrome Debugger API from a web page, enabling method calls and event handling via a message-passing interface.

### Public API

#### Superpowers.debugger.on(eventName, callback)
- Purpose: Registers an event listener for debugger events.
- Input:
  - `eventName` (string): The name of the event to listen for. Supported events are `onDetach` and `onEvent`.
  - `callback` (function): The function to be called when the event is triggered.
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.debugger.on('onDetach', (source, reason) => {
    console.log('Debugger detached from', source, 'due to', reason);
  });
  ```

#### Superpowers.debugger.off(eventName, callback)
- Purpose: Removes a previously registered event listener.
- Input:
  - `eventName` (string): The name of the event for which the listener is to be removed.
  - `callback` (function): The function that was originally registered.
- Returns: `void`
- Example:
  ```javascript
  function onDetachHandler(source, reason) {
    console.log('Debugger detached from', source, 'due to', reason);
  }
  window.Superpowers.debugger.on('onDetach', onDetachHandler);
  window.Superpowers.debugger.off('onDetach', onDetachHandler);
  ```

#### Superpowers.debugger.[methodName](...)
- Purpose: Calls a specified method on the Chrome Debugger API.
- Input:
  - `methodName` (string): The name of the debugger method to call (e.g., `attach`, `detach`, `sendCommand`, `getTargets`).
  - `...args` (any): Arguments required by the specified method.
- Returns: `Promise<any>` - Resolves with the result of the method call or rejects with an error if the call fails.
- Example:
  ```javascript
  window.Superpowers.debugger.attach({ tabId: 123 }, '1.3').then(() => {
    console.log('Debugger attached');
  }).catch(error => {
    console.error('Failed to attach debugger:', error);
  });
  ```

Note: The `Superpowers.debugger` object is a proxy that validates method access and ensures the debugger interface is properly initialized before making any calls.
### superenv
Type: Utility
Purpose: The "superenv" plugin provides an interface for managing environment variables within a browser extension context. It allows for retrieval, setting, and management of multiple environment variable sets, as well as logging debug information.

### Public API

#### Superpowers.getEnvVars()
- Purpose: Retrieve the current environment variables.
- Input: None
- Returns: A Promise that resolves to an object containing the current environment variables.
- Example:
  ```javascript
  window.Superpowers.getEnvVars().then(vars => console.log(vars));
  ```

#### Superpowers.setEnvVars()
- Purpose: (Deprecated) Attempt to set environment variables. This method is deprecated and will log a warning.
- Input: None
- Returns: A Promise that resolves to an object indicating failure with a message.
- Example:
  ```javascript
  window.Superpowers.setEnvVars().then(response => console.log(response));
  ```

#### Superpowers.listEnvSets()
- Purpose: List all available environment variable sets.
- Input: None
- Returns: A Promise that resolves to an object containing all environment variable sets.
- Example:
  ```javascript
  window.Superpowers.listEnvSets().then(envSets => console.log(envSets));
  ```

#### Superpowers.getEnvSet(envName)
- Purpose: Retrieve a specific set of environment variables by name.
- Input: `envName` (String) - The name of the environment set to retrieve.
- Returns: A Promise that resolves to an object containing the specified environment set.
- Example:
  ```javascript
  window.Superpowers.getEnvSet('production').then(envSet => console.log(envSet));
  ```

#### Superpowers.setEnvSet(envName, varsObj)
- Purpose: Set or update a specific environment variable set.
- Input: 
  - `envName` (String) - The name of the environment set to update.
  - `varsObj` (Object) - An object containing the environment variables to set.
- Returns: A Promise that resolves to an object indicating success.
- Example:
  ```javascript
  window.Superpowers.setEnvSet('staging', { API_KEY: '12345' }).then(response => console.log(response));
  ```

#### Superpowers.deleteEnvSet(envName)
- Purpose: Delete a specific environment variable set by name.
- Input: `envName` (String) - The name of the environment set to delete.
- Returns: A Promise that resolves to an object indicating success or failure.
- Example:
  ```javascript
  window.Superpowers.deleteEnvSet('test').then(response => console.log(response));
  ```

#### Superpowers.debugLog(message, level, source)
- Purpose: Log a debug message with a specified level and source.
- Input:
  - `message` (String) - The debug message to log.
  - `level` (String, optional) - The severity level of the log (default: "info").
  - `source` (String, optional) - The source of the log message (default: "page").
- Returns: None
- Example:
  ```javascript
  window.Superpowers.debugLog('This is a debug message', 'warn', 'customSource');
  ```
### superconsoleintercept
Type: Utility
Purpose: The `superconsoleintercept` plugin intercepts console messages in a web page, forwards them to a service worker, and broadcasts them across all open tabs. It allows developers to register callbacks for specific console message levels and control the transmission of these messages.

### Public API

#### Superpowers.console.on(level, callback)
- Purpose: Registers a callback to be invoked whenever a console message of the specified level is intercepted.
- Input: 
  - `level` (string): The console message level to listen for (e.g., "log", "info", "warn", "error").
  - `callback` (function): The function to be called with the console message arguments.
- Returns: None
- Example:
  ```javascript
  Superpowers.console.on("log", (message) => {
    console.log("Intercepted log message:", message);
  });
  ```

#### Superpowers.console.off(level, callback)
- Purpose: Unregisters a previously registered callback for a specific console message level.
- Input:
  - `level` (string): The console message level for which the callback was registered.
  - `callback` (function): The callback function to remove.
- Returns: None
- Example:
  ```javascript
  const myCallback = (message) => console.log("Intercepted log message:", message);
  Superpowers.console.on("log", myCallback);
  Superpowers.console.off("log", myCallback);
  ```

#### Superpowers.console.onAll(callback)
- Purpose: Registers a callback to be invoked for all console message levels.
- Input:
  - `callback` (function): The function to be called with the console message arguments for any level.
- Returns: None
- Example:
  ```javascript
  Superpowers.console.onAll((level, message) => {
    console.log(`Intercepted ${level} message:`, message);
  });
  ```

#### Superpowers.console.turnTransmissionOn()
- Purpose: Enables the transmission of intercepted console messages from the page to the content script.
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnTransmissionOn();
  ```

#### Superpowers.console.turnTransmissionOff()
- Purpose: Disables the transmission of intercepted console messages from the page to the content script.
- Input: None
- Returns: None
- Example:
  ```javascript
  Superpowers.console.turnTransmissionOff();
  ```
### gsc
Type: Plugin
Purpose: The "gsc" plugin facilitates interaction with Google Search Console by providing methods to manage sites, query search analytics, handle sitemaps, and perform URL inspections through a browser extension interface.

### Public API
#### Superpowers.Gsc.login(customCreds)
- Purpose: Initiates a login process using Google Search Console credentials.
- Input: `customCreds` (optional) - An object containing custom credential parameters.
- Returns: A promise that resolves with a success message if login is verified.
- Example:
  ```javascript
  window.Superpowers.Gsc.login({ service: "custom-service" })
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getLoginStatus()
- Purpose: Checks the current login status of the user.
- Input: None.
- Returns: A boolean indicating whether the user is logged in.
- Example:
  ```javascript
  const isLoggedIn = window.Superpowers.Gsc.getLoginStatus();
  console.log(isLoggedIn);
  ```

#### Superpowers.Gsc.test()
- Purpose: Tests the login functionality by attempting a login with default credentials.
- Input: None.
- Returns: A promise that resolves if the test login is successful.
- Example:
  ```javascript
  window.Superpowers.Gsc.test()
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.listSites()
- Purpose: Lists all sites associated with the authenticated Google Search Console account.
- Input: None.
- Returns: A promise that resolves with a list of sites.
- Example:
  ```javascript
  window.Superpowers.Gsc.listSites()
    .then(sites => console.log(sites))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getSiteInfo(siteUrl)
- Purpose: Retrieves detailed information about a specific site.
- Input: `siteUrl` (string) - The URL of the site to retrieve information for.
- Returns: A promise that resolves with site information.
- Example:
  ```javascript
  window.Superpowers.Gsc.getSiteInfo('https://example.com')
    .then(info => console.log(info))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.querySearchAnalytics(siteUrl, queryBody)
- Purpose: Queries search analytics data for a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `queryBody` (object) - The body of the query, including date range and dimensions.
- Returns: A promise that resolves with search analytics data.
- Example:
  ```javascript
  const queryBody = { startDate: '2023-01-01', endDate: '2023-01-31', dimensions: ['query'] };
  window.Superpowers.Gsc.querySearchAnalytics('https://example.com', queryBody)
    .then(data => console.log(data))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.submitSitemap(siteUrl, sitemapUrl)
- Purpose: Submits a sitemap for a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `sitemapUrl` (string) - The URL of the sitemap to submit.
- Returns: A promise that resolves when the sitemap is successfully submitted.
- Example:
  ```javascript
  window.Superpowers.Gsc.submitSitemap('https://example.com', 'https://example.com/sitemap.xml')
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.deleteSitemap(siteUrl, sitemapUrl)
- Purpose: Deletes a sitemap from a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `sitemapUrl` (string) - The URL of the sitemap to delete.
- Returns: A promise that resolves when the sitemap is successfully deleted.
- Example:
  ```javascript
  window.Superpowers.Gsc.deleteSitemap('https://example.com', 'https://example.com/sitemap.xml')
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.listSitemaps(siteUrl)
- Purpose: Lists all sitemaps for a specified site.
- Input: `siteUrl` (string) - The URL of the site.
- Returns: A promise that resolves with a list of sitemaps.
- Example:
  ```javascript
  window.Superpowers.Gsc.listSitemaps('https://example.com')
    .then(sitemaps => console.log(sitemaps))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.addSite(siteUrl)
- Purpose: Adds a new site to the Google Search Console account.
- Input: `siteUrl` (string) - The URL of the site to add.
- Returns: A promise that resolves when the site is successfully added.
- Example:
  ```javascript
  window.Superpowers.Gsc.addSite('https://newsite.com')
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.deleteSite(siteUrl)
- Purpose: Deletes a site from the Google Search Console account.
- Input: `siteUrl` (string) - The URL of the site to delete.
- Returns: A promise that resolves when the site is successfully deleted.
- Example:
  ```javascript
  window.Superpowers.Gsc.deleteSite('https://example.com')
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getSite(siteUrl)
- Purpose: Retrieves information about a specific site.
- Input: `siteUrl` (string) - The URL of the site to retrieve.
- Returns: A promise that resolves with site information.
- Example:
  ```javascript
  window.Superpowers.Gsc.getSite('https://example.com')
    .then(site => console.log(site))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getSitemap(siteUrl, sitemapUrl)
- Purpose: Retrieves information about a specific sitemap for a site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `sitemapUrl` (string) - The URL of the sitemap to retrieve.
- Returns: A promise that resolves with sitemap information.
- Example:
  ```javascript
  window.Superpowers.Gsc.getSitemap('https://example.com', 'https://example.com/sitemap.xml')
    .then(sitemap => console.log(sitemap))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getTopQueries(siteUrl, options)
- Purpose: Retrieves the top search queries for a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `options` (object, optional) - Additional query options.
- Returns: A promise that resolves with the top queries data.
- Example:
  ```javascript
  window.Superpowers.Gsc.getTopQueries('https://example.com')
    .then(queries => console.log(queries))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getTopPages(siteUrl, options)
- Purpose: Retrieves the top pages for a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `options` (object, optional) - Additional query options.
- Returns: A promise that resolves with the top pages data.
- Example:
  ```javascript
  window.Superpowers.Gsc.getTopPages('https://example.com')
    .then(pages => console.log(pages))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getDetailedAnalytics(siteUrl, options)
- Purpose: Retrieves detailed analytics for a specified site.
- Input: 
  - `siteUrl` (string) - The URL of the site.
  - `options` (object, optional) - Additional query options.
- Returns: A promise that resolves with detailed analytics data.
- Example:
  ```javascript
  window.Superpowers.Gsc.getDetailedAnalytics('https://example.com')
    .then(data => console.log(data))
    .catch(error => console.error(error));
  ```

#### Superpowers.Gsc.getTopPagesDetailed(siteUrl, options)
- Purpose: Retrieves detailed analytics for the top
### superping
Type: Utility
Purpose: The superping plugin facilitates a synchronous communication mechanism from a webpage to a service worker via a content script, allowing messages to be logged or echoed without requiring a real-time response.

### Public API
#### Superpowers.ping(msg)
- Purpose: Provides a synchronous method to send a message from a webpage to a service worker. The method immediately returns the message while also forwarding it to the service worker for logging or processing.
- Input: 
  - `msg` (String): The message to be sent and returned.
- Returns: 
  - (String): The same `msg` that was passed as input.
- Example:
  ```javascript
  const response = window.Superpowers.ping("Hello, service worker!");
  console.log(response); // Outputs: "Hello, service worker!"
  ```

This method enables a "fire and forget" messaging pattern, where the page sends a message to the service worker without waiting for a response, making it appear synchronous from the page's perspective.
### superfetch
Type: Utility  
Purpose: Provides an enhanced fetch capability that operates across different contexts (page, content script, and service worker) to perform network requests with extended functionality and timeout management.

### Public API

#### Superpowers.setSuperfetchTimeout(ms)
- Purpose: Sets the timeout duration for superfetch requests.
- Input: 
  - `ms` (Number): The timeout duration in milliseconds.
- Returns: `void`
- Example:
  ```javascript
  window.Superpowers.setSuperfetchTimeout(60000); // Set timeout to 60 seconds
  ```

#### Superpowers.whatsGoingOn()
- Purpose: Retrieves the current active superfetch requests.
- Input: None
- Returns: `Array`: An array of active request objects, each containing `requestId`, `url`, and `startTime`.
- Example:
  ```javascript
  const activeRequests = window.Superpowers.whatsGoingOn();
  console.log(activeRequests);
  ```

#### Superpowers.fetch(url, options)
- Purpose: Performs a network request using the superfetch mechanism, providing enhanced response handling and timeout management.
- Input:
  - `url` (String): The URL to fetch.
  - `options` (Object, optional): The fetch options, similar to the standard Fetch API.
- Returns: `Promise`: A promise that resolves to an enhanced response object with additional methods and properties.
- Example:
  ```javascript
  window.Superpowers.fetch('https://api.example.com/data')
    .then(response => {
      console.log(response.status); // Access status
      return response.json(); // Parse JSON
    })
    .then(data => {
      console.log(data); // Use the parsed data
    })
    .catch(error => {
      console.error('Fetch error:', error);
    });
  ```

The enhanced response object includes:
- Standard properties: `status`, `statusText`, `ok`, `redirected`, `url`, `type`, `headers`.
- Standard methods: `text()`, `json()`, `blob()`, `arrayBuffer()`.
- Superpowers extras: `_superfetch` object containing `requestId`, `timestamp`, `rawHeaders`, `rawBody`, and `performance` metrics.
- Helper method: `getHeadersObject()` to retrieve headers as an object.
### superpages
Type: Utility
Purpose: The superpages plugin facilitates the creation of downloadable content blobs in the browser, allowing web pages to generate and manage downloadable files dynamically.

### Public API
#### Superpowers.pages(content, options)
- Purpose: Generates a downloadable blob URL from provided content, allowing for dynamic file creation and download within a web page.
- Input:
  - `content` (String): The content to be converted into a downloadable blob.
  - `options` (Object, optional): Configuration options for the blob creation.
    - `filename` (String, optional): Suggested filename for the download.
    - `mimeType` (String, optional): MIME type for the blob. Defaults to "text/html" if not specified.
- Returns: 
  - (Promise): Resolves with the blob URL string if successful, or rejects with an error message if failed.
- Example:
  ```javascript
  window.Superpowers.pages("<h1>Hello, World!</h1>", { filename: "greeting.html", mimeType: "text/html" })
    .then((url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = "greeting.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up the object URL after use
    })
    .catch((error) => {
      console.error("Failed to create downloadable content:", error);
    });
  ```
### superpingasync
Type: Utility
Purpose: Provides asynchronous ping functionality for web pages, enabling communication between a web page and a browser extension.

### Public API
#### Superpowers.asyncPing(message)
- Purpose: Sends an asynchronous ping message from a web page to the browser extension and receives a response.
- Input: 
  - `message` (string): The message to be sent as part of the ping request.
- Returns: 
  - A `Promise` that resolves with the response result if the ping is successful, or rejects with an error message if the ping fails.
- Example:
  ```javascript
  window.Superpowers.asyncPing("Hello, extension!").then(response => {
    console.log("Received response:", response);
  }).catch(error => {
    console.error("Ping failed:", error);
  });
  ```

This method facilitates communication by posting a message from the page to the content script, which in turn communicates with the extension's background script. The background script processes the message and sends back a response, which is then relayed to the original page.
### superruntime
Type: Utility
Purpose: The "superruntime" plugin facilitates communication between a web page and a browser extension's background scripts, allowing method calls and event handling through a unified interface.

### Public API
#### Superpowers.runtime.on(eventName, callback)
- Purpose: Registers a callback function to be invoked when a specific runtime event occurs.
- Input: 
  - `eventName` (String): The name of the event to listen for.
  - `callback` (Function): The function to call when the event is triggered.
- Returns: None
- Example:
  ```javascript
  Superpowers.runtime.on('onStartup', (args) => {
    console.log('Extension started:', args);
  });
  ```

#### Superpowers.runtime.off(eventName, callback)
- Purpose: Unregisters a previously registered callback function for a specific runtime event.
- Input:
  - `eventName` (String): The name of the event to stop listening for.
  - `callback` (Function): The function to remove from the event listener list.
- Returns: None
- Example:
  ```javascript
  const onStartupCallback = (args) => {
    console.log('Extension started:', args);
  };
  Superpowers.runtime.on('onStartup', onStartupCallback);
  Superpowers.runtime.off('onStartup', onStartupCallback);
  ```

#### Superpowers.runtime.xxxMethod(...args)
- Purpose: Dynamically calls a method on the `chrome.runtime` API, using the method name as `xxxMethod`.
- Input:
  - `...args` (Any): Arguments to pass to the `chrome.runtime` method.
- Returns: A Promise that resolves with the result of the method call or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.runtime.getBackgroundPage().then(page => {
    console.log('Background page:', page);
  }).catch(err => {
    console.error('Error:', err);
  });
  ```

Note: The `Superpowers.runtime.xxxMethod` is a proxy that allows any method of the `chrome.runtime` API to be called as if it were a direct method of the `Superpowers.runtime` object, provided the method exists in the `chrome.runtime` namespace.
### superscreenshot
Type: Utility
Purpose: The "superscreenshot" plugin provides a mechanism to capture screenshots of web pages or specific browser tabs. It supports capturing visible or full-page screenshots in different formats and qualities, with options to inject custom CSS or JavaScript before capture.

### Public API
#### Superpowers.screenshot(payload)
- Purpose: Initiates a screenshot capture operation based on the provided configuration. The operation is asynchronous and returns a promise that resolves with the screenshot data URL or rejects with an error message.
- Input: 
  - `payload` (object): Configuration object for the screenshot operation. It adheres to the `ScreenshotConfig` type, which includes the following properties:
    - `url` (string, optional): URL of the page to capture. Required if `tabId` is not provided.
    - `tabId` (number, optional): ID of the tab to capture. Required if `url` is not provided.
    - `captureMode` ("visible"|"full", default: "visible"): Specifies whether to capture the visible area or the full page.
    - `format` ("png"|"jpeg", default: "png"): Image format for the screenshot.
    - `quality` (number, default: 100): Quality of the JPEG image (0-100). Ignored if format is PNG.
    - `delayMs` (number, default: 1000): Delay in milliseconds before capturing the screenshot.
    - `keepTabOpen` (boolean, default: false): If true, keeps the tab open after capture.
    - `width` (number, optional): Width of the window if a new window is created.
    - `height` (number, optional): Height of the window if a new window is created.
    - `injectCss` (string, optional): CSS to inject into the page before capture.
    - `injectJs` (string, optional): JavaScript to inject into the page before capture.
- Returns: 
  - A `Promise` that resolves with a `string` representing the data URL of the captured screenshot if successful, or rejects with an `error` message if the capture fails.
- Example:
  ```javascript
  // Capture a full-page screenshot of a specific URL
  window.Superpowers.screenshot({
    url: "https://example.com",
    captureMode: "full",
    format: "jpeg",
    quality: 80,
    injectCss: "body { background-color: #fff; }",
    injectJs: "console.log('Injecting JS before capture');"
  })
  .then(dataUrl => {
    console.log("Screenshot captured:", dataUrl);
  })
  .catch(error => {
    console.error("Screenshot capture failed:", error);
  });
  ```
### superurlget
Type: Utility
Purpose: The `superurlget` plugin is designed to retrieve and process web page content using various methods, allowing developers to programmatically access rendered pages, HTML, DOM, or text content.

### Public API
#### Superpowers.Urlget.getRenderedPage(url, config)
- Purpose: Retrieves the fully rendered page content, including HTML, text, and metadata like the page title and URL.
- Input:
  - `url` (string): The URL of the page to retrieve.
  - `config` (object, optional): Configuration options for the retrieval process, such as event waiting and script injections.
- Returns: A promise that resolves with an object containing the rendered page content, including `title`, `url`, `html`, and `text`.
- Example:
  ```javascript
  Superpowers.Urlget.getRenderedPage('https://example.com', { waitForEvent: 'load' })
    .then(content => console.log(content))
    .catch(error => console.error(error));
  ```

#### Superpowers.Urlget.getHtml(url, config)
- Purpose: Retrieves the raw HTML content of the specified page.
- Input:
  - `url` (string): The URL of the page to retrieve.
  - `config` (object, optional): Configuration options for the retrieval process.
- Returns: A promise that resolves with an object containing the `html` of the page.
- Example:
  ```javascript
  Superpowers.Urlget.getHtml('https://example.com')
    .then(html => console.log(html))
    .catch(error => console.error(error));
  ```

#### Superpowers.Urlget.getDom(url, config)
- Purpose: Retrieves the DOM structure of the specified page as HTML.
- Input:
  - `url` (string): The URL of the page to retrieve.
  - `config` (object, optional): Configuration options for the retrieval process.
- Returns: A promise that resolves with an object containing the `html` representing the DOM.
- Example:
  ```javascript
  Superpowers.Urlget.getDom('https://example.com')
    .then(dom => console.log(dom))
    .catch(error => console.error(error));
  ```

#### Superpowers.Urlget.getText(url, config)
- Purpose: Retrieves the visible text content of the specified page.
- Input:
  - `url` (string): The URL of the page to retrieve.
  - `config` (object, optional): Configuration options for the retrieval process.
- Returns: A promise that resolves with an object containing the `text` of the page.
- Example:
  ```javascript
  Superpowers.Urlget.getText('https://example.com')
    .then(text => console.log(text))
    .catch(error => console.error(error));
  ```
### superwebnavigation
Type: Bridge
Purpose: Facilitates communication between a web page, content scripts, and service workers to utilize `chrome.webNavigation` functionalities and events.

### Public API

#### Superpowers.webNavigation.xxxMethod(...)
- Purpose: Dynamically invoke methods from the `chrome.webNavigation` API within a web page context.
- Input: 
  - `methodName` (string): Name of the `chrome.webNavigation` method to invoke.
  - `...args` (any): Arguments required by the specified `chrome.webNavigation` method.
- Returns: A Promise that resolves with the result of the `chrome.webNavigation` method call or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.webNavigation.getAllFrames({ tabId: 123 })
    .then(frames => console.log(frames))
    .catch(error => console.error(error));
  ```

#### Superpowers.webNavigation.on(eventName, callback)
- Purpose: Register a callback function to listen for specific `chrome.webNavigation` events.
- Input:
  - `eventName` (string): Name of the `chrome.webNavigation` event to listen for (e.g., `onBeforeNavigate`, `onCommitted`).
  - `callback` (function): Function to execute when the event occurs, receiving event details as arguments.
- Returns: None.
- Example:
  ```javascript
  Superpowers.webNavigation.on('onCompleted', (details) => {
    console.log('Navigation completed:', details);
  });
  ```

#### Superpowers.webNavigation.off(eventName, callback)
- Purpose: Unregister a previously registered callback function for a specific `chrome.webNavigation` event.
- Input:
  - `eventName` (string): Name of the event for which the callback was registered.
  - `callback` (function): The callback function to remove.
- Returns: None.
- Example:
  ```javascript
  function handleNavigation(details) {
    console.log('Navigation completed:', details);
  }

  Superpowers.webNavigation.on('onCompleted', handleNavigation);
  // Later, to remove the listener:
  Superpowers.webNavigation.off('onCompleted', handleNavigation);
  ```
### supersidepanel
Type: Bridge
Purpose: The supersidepanel plugin facilitates communication between a web page and a Chrome extension's service worker, enabling interaction with the `chrome.sidePanel` API through a series of public methods exposed on the `window.Superpowers` object.

### Public API

#### Superpowers.sidePanel.open(options)
- Purpose: Opens the side panel with the specified options.
- Input: `options` (Object) - Configuration options for opening the side panel.
- Returns: `Promise<any>` - Resolves with the result of the `chrome.sidePanel.open` method.
- Example:
  ```javascript
  window.Superpowers.sidePanel.open({ url: "https://example.com" })
    .then(result => console.log("Panel opened:", result))
    .catch(error => console.error("Error opening panel:", error));
  ```

#### Superpowers.sidePanel.setOptions(options)
- Purpose: Sets options for the side panel.
- Input: `options` (Object) - Options to configure the side panel.
- Returns: `Promise<any>` - Resolves with the result of the `chrome.sidePanel.setOptions` method.
- Example:
  ```javascript
  window.Superpowers.sidePanel.setOptions({ width: 300 })
    .then(result => console.log("Options set:", result))
    .catch(error => console.error("Error setting options:", error));
  ```

#### Superpowers.sidePanel.getOptions()
- Purpose: Retrieves the current options of the side panel.
- Input: None
- Returns: `Promise<any>` - Resolves with the current options of the side panel.
- Example:
  ```javascript
  window.Superpowers.sidePanel.getOptions()
    .then(options => console.log("Current options:", options))
    .catch(error => console.error("Error retrieving options:", error));
  ```

#### Superpowers.sidePanel.setPanelBehavior(behavior)
- Purpose: Sets the behavior of the side panel.
- Input: `behavior` (Object) - Behavior settings for the side panel.
- Returns: `Promise<any>` - Resolves with the result of the `chrome.sidePanel.setPanelBehavior` method.
- Example:
  ```javascript
  window.Superpowers.sidePanel.setPanelBehavior({ autoHide: true })
    .then(result => console.log("Behavior set:", result))
    .catch(error => console.error("Error setting behavior:", error));
  ```

#### Superpowers.sidePanel.getPanelBehavior()
- Purpose: Retrieves the current behavior settings of the side panel.
- Input: None
- Returns: `Promise<any>` - Resolves with the current behavior settings of the side panel.
- Example:
  ```javascript
  window.Superpowers.sidePanel.getPanelBehavior()
    .then(behavior => console.log("Current behavior:", behavior))
    .catch(error => console.error("Error retrieving behavior:", error));
  ```

#### Superpowers.sidePanel.on(eventName, callback)
- Purpose: Registers an event listener for future side panel events (currently none exist).
- Input: 
  - `eventName` (String) - The name of the event to listen for.
  - `callback` (Function) - The function to call when the event occurs.
- Returns: None
- Example:
  ```javascript
  window.Superpowers.sidePanel.on("someEvent", (data) => {
    console.log("Event received:", data);
  });
  ```

#### Superpowers.sidePanel.off(eventName, callback)
- Purpose: Unregisters an event listener for side panel events.
- Input: 
  - `eventName` (String) - The name of the event to stop listening for.
  - `callback` (Function) - The function to remove from the event listeners.
- Returns: None
- Example:
  ```javascript
  const myCallback = (data) => console.log("Event received:", data);
  window.Superpowers.sidePanel.on("someEvent", myCallback);
  window.Superpowers.sidePanel.off("someEvent", myCallback);
  ```
### supertabs
Type: Utility
Purpose: Provides a bridge for interacting with Chrome's `chrome.tabs` API from a web page, facilitating method calls and event handling for tab-related operations.

### Public API

#### Superpowers.tabs.query(...)
- Purpose: Retrieve information about tabs that match the specified properties.
- Input: An object specifying properties to match tabs against (e.g., `{ active: true }`).
- Returns: A Promise that resolves with an array of tab objects.
- Example:
  ```javascript
  Superpowers.tabs.query({ active: true }).then(tabs => {
    console.log(tabs);
  });
  ```

#### Superpowers.tabs.create(...)
- Purpose: Create a new tab with the specified properties.
- Input: An object specifying properties for the new tab (e.g., `{ url: 'https://www.example.com' }`).
- Returns: A Promise that resolves with the created tab object.
- Example:
  ```javascript
  Superpowers.tabs.create({ url: 'https://www.example.com' }).then(tab => {
    console.log('Created tab:', tab);
  });
  ```

#### Superpowers.tabs.reload(...)
- Purpose: Reload a specified tab.
- Input: The ID of the tab to reload and an optional object with reload properties.
- Returns: A Promise that resolves when the tab has been reloaded.
- Example:
  ```javascript
  Superpowers.tabs.reload(tabId).then(() => {
    console.log('Tab reloaded');
  });
  ```

#### Superpowers.tabs.on(eventName, callback)
- Purpose: Attach a listener for specified tab events.
- Input: 
  - `eventName`: The name of the event to listen for (e.g., `"onCreated"`).
  - `callback`: A function to be called when the event occurs, receiving event-specific arguments.
- Returns: Void.
- Example:
  ```javascript
  Superpowers.tabs.on('onCreated', (tab) => {
    console.log('Tab created:', tab);
  });
  ```

#### Superpowers.tabs.off(eventName, callback)
- Purpose: Detach a previously attached listener for specified tab events.
- Input: 
  - `eventName`: The name of the event to stop listening for.
  - `callback`: The function that was previously attached.
- Returns: Void.
- Example:
  ```javascript
  Superpowers.tabs.off('onCreated', myCallbackFunction);
  ```

### Note
- The `Superpowers.tabs` object acts as a proxy to dynamically call any `chrome.tabs` method using `callMethod`. This includes any other methods not explicitly listed here, provided they exist in the `chrome.tabs` API.
- Event names for `on` and `off` methods correspond to Chrome's tab events such as `onCreated`, `onUpdated`, etc.
### superopenai
Type: Utility
Purpose: The `superopenai` plugin facilitates interaction with OpenAI's API, providing methods for chat completions, image generation, audio processing, embeddings, fine-tuning, file management, model management, and batch operations. It supports both synchronous and streaming requests.

### Public API
#### Superpowers.OpenAI.test(...)
- Purpose: Test the connection and functionality of the plugin.
- Input: None
- Returns: Promise resolving with a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.test().then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.chatCompletion(...)
- Purpose: Perform a non-streaming chat completion using OpenAI's models.
- Input: Object containing model and message details.
- Returns: Promise resolving with the chat completion result.
- Example:
  ```javascript
  Superpowers.OpenAI.chatCompletion({ model: "gpt-4", messages: [...] }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.chatCompletionStream(...)
- Purpose: Perform a streaming chat completion, receiving partial results as they become available.
- Input: Object containing model and message details.
- Returns: Promise resolving when the stream completes.
- Example:
  ```javascript
  Superpowers.OpenAI.chatCompletionStream({ model: "gpt-4", messages: [...] }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.imageGeneration(...)
- Purpose: Generate images based on a given prompt.
- Input: Object containing model, prompt, and other generation parameters.
- Returns: Promise resolving with the generated image data.
- Example:
  ```javascript
  Superpowers.OpenAI.imageGeneration({ prompt: "A cute cat" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.structuredCompletion(...)
- Purpose: Perform a structured completion task, formatting the response as specified.
- Input: Object containing model, messages, and response format.
- Returns: Promise resolving with the structured completion result.
- Example:
  ```javascript
  Superpowers.OpenAI.structuredCompletion({ model: "gpt-4o", messages: [...] }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.functionCall(...)
- Purpose: Execute a function call with specified tools and options.
- Input: Object containing model, messages, and tool configurations.
- Returns: Promise resolving with the function call result.
- Example:
  ```javascript
  Superpowers.OpenAI.functionCall({ model: "gpt-4o", messages: [...] }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.setApiKey(key)
- Purpose: Set the API key for authenticating with OpenAI's services.
- Input: String representing the API key.
- Returns: Promise resolving with a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.setApiKey("your-api-key").then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.setOrganizationId(orgId)
- Purpose: Set the organization ID for OpenAI's services.
- Input: String representing the organization ID.
- Returns: Promise resolving with a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.setOrganizationId("your-org-id").then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.audioSpeech(...)
- Purpose: Convert text to speech using OpenAI's models.
- Input: Object containing model, input text, and voice settings.
- Returns: Promise resolving with the audio data.
- Example:
  ```javascript
  Superpowers.OpenAI.audioSpeech({ input: "Hello world" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.audioTranscription(...)
- Purpose: Transcribe audio files to text.
- Input: Object containing audio file and model details.
- Returns: Promise resolving with the transcription result.
- Example:
  ```javascript
  Superpowers.OpenAI.audioTranscription({ file: audioFile }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.audioTranslation(...)
- Purpose: Translate audio content to another language.
- Input: Object containing audio file and model details.
- Returns: Promise resolving with the translation result.
- Example:
  ```javascript
  Superpowers.OpenAI.audioTranslation({ file: audioFile }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.embeddings(...)
- Purpose: Generate text embeddings using OpenAI's models.
- Input: Object containing model and input text.
- Returns: Promise resolving with the embeddings data.
- Example:
  ```javascript
  Superpowers.OpenAI.embeddings({ input: "Sample text" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneCreate(...)
- Purpose: Create a new fine-tuning job.
- Input: Object containing model, training file, and other configurations.
- Returns: Promise resolving with the fine-tuning job details.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneCreate({ training_file: "file-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneList(...)
- Purpose: List all fine-tuning jobs.
- Input: Object with optional query parameters.
- Returns: Promise resolving with the list of fine-tuning jobs.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneList().then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneRetrieve(...)
- Purpose: Retrieve details of a specific fine-tuning job.
- Input: Object containing the fine-tuning job ID.
- Returns: Promise resolving with the job details.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneRetrieve({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneCancel(...)
- Purpose: Cancel a specific fine-tuning job.
- Input: Object containing the fine-tuning job ID.
- Returns: Promise resolving with the cancellation result.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneCancel({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneListEvents(...)
- Purpose: List events of a specific fine-tuning job.
- Input: Object containing the fine-tuning job ID and optional query parameters.
- Returns: Promise resolving with the list of events.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneListEvents({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fineTuneListCheckpoints(...)
- Purpose: List checkpoints of a specific fine-tuning job.
- Input: Object containing the fine-tuning job ID and optional query parameters.
- Returns: Promise resolving with the list of checkpoints.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneListCheckpoints({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fileUpload(...)
- Purpose: Upload a file for use in OpenAI's services.
- Input: Object containing the file and its purpose.
- Returns: Promise resolving with the file upload result.
- Example:
  ```javascript
  Superpowers.OpenAI.fileUpload({ file: fileBlob }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fileList(...)
- Purpose: List files uploaded to OpenAI.
- Input: Object with optional query parameters.
- Returns: Promise resolving with the list of files.
- Example:
  ```javascript
  Superpowers.OpenAI.fileList().then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fileRetrieve(...)
- Purpose: Retrieve details of a specific file.
- Input: Object containing the file ID.
- Returns: Promise resolving with the file details.
- Example:
  ```javascript
  Superpowers.OpenAI.fileRetrieve({ file_id: "file-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fileDelete(...)
- Purpose: Delete a specific file.
- Input: Object containing the file ID.
- Returns: Promise resolving with the deletion result.
- Example:
  ```javascript
  Superpowers.OpenAI.fileDelete({ file_id: "file-id" }).then(console.log).catch(console.error);
  ```

#### Superpowers.OpenAI.fileContent(...)
- Purpose: Retrieve the content of a specific file.
- Input: Object containing the file ID.
-
### superwebrequest
Type: Utility
Purpose: Facilitates interaction with the Chrome `webRequest` API from a web page context, enabling method calls and event handling through a proxy interface.

### Public API
#### Superpowers.webrequest.on(eventName, callback)
- Purpose: Registers a callback function to be executed when a specified webRequest event occurs.
- Input:
  - `eventName` (string): The name of the webRequest event to listen for. Supported events include `onBeforeRequest`, `onBeforeSendHeaders`, `onSendHeaders`, `onHeadersReceived`, `onAuthRequired`, `onResponseStarted`, `onBeforeRedirect`, `onCompleted`, `onErrorOccurred`.
  - `callback` (function): The function to be called when the event is triggered. It receives the event arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.webrequest.on('onBeforeRequest', (details) => {
    console.log('Request details:', details);
  });
  ```

#### Superpowers.webrequest.off(eventName, callback)
- Purpose: Unregisters a previously registered callback for a specified webRequest event.
- Input:
  - `eventName` (string): The name of the webRequest event to stop listening for.
  - `callback` (function): The function to be removed from the event's callback list.
- Returns: `void`
- Example:
  ```javascript
  const callback = (details) => {
    console.log('Request details:', details);
  };
  Superpowers.webrequest.on('onBeforeRequest', callback);
  Superpowers.webrequest.off('onBeforeRequest', callback);
  ```

#### Superpowers.webrequest.[methodName](...args)
- Purpose: Invokes a method from the Chrome `webRequest` API, such as `handlerBehaviorChanged`, using a promise-based approach.
- Input:
  - `methodName` (string): The name of the method to call on the `webRequest` API.
  - `...args` (any): Arguments to be passed to the specified method.
- Returns: `Promise<any>`: Resolves with the result of the method call or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.webrequest.handlerBehaviorChanged()
    .then(() => {
      console.log('Handler behavior changed successfully.');
    })
    .catch((error) => {
      console.error('Error changing handler behavior:', error);
    });
  ```

This API provides a structured way to interact with the Chrome `webRequest` API, allowing developers to handle webRequest events and call methods directly from the web page context.

----
# Superpowers AI Assistant Example
----

# Complete Superpowers HTML App Example

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
const modelConfigs={
  'o1-mini':{maxTokens:65536,temperature:1},
  'o1-preview':{maxTokens:32768,temperature:1},
  'gpt-4o':{maxTokens:16384,temperature:0.7},
  'gpt-4o-mini':{maxTokens:16384,temperature:0.7},
};
const MIN_TOKENS=16384;
let currentModel='gpt-4o';

// STATE
let todos=[];
let chatHistory=[];
let debugMode=false;
let isProcessing=false;

// LOG
const log=(typ,msg,data=null)=>{
  let ts=new Date().toISOString();
  let full=`[${ts}] [${typ.toUpperCase()}] ${msg}`;
  console.log(full,data||'');
  if(debugMode){
    let d=document.getElementById('debug-panel');
    d.style.display='block';
    d.innerHTML+=`<div>${full}</div>`;
    if(data)d.innerHTML+=`<pre>${JSON.stringify(data,null,2)}</pre>`;
    d.scrollTop=d.scrollHeight;
  }
};

// MIN TOKEN ENFORCEMENT
function getModelCfg(k){
  let c=modelConfigs[k]||modelConfigs['gpt-4o'];
  if(c.maxTokens<MIN_TOKENS){
    log('warn',`Model ${k} had < ${MIN_TOKENS} tokens, forcing ${MIN_TOKENS}`);
    c.maxTokens=MIN_TOKENS;
  }
  return c;
}

// SHOW/REMOVE STATUS
const showStatus=(m,t)=>{
  let s=document.getElementById('status-area');
  s.innerHTML=`<div class="status ${t}">${m}</div>`;
  setTimeout(()=>{s.innerHTML='';},5000);
};

// AI JSON PARSE
const parseAIJSON=raw=>{
  let cleaned=raw.replace(/```/g,'').trim();
  try{return JSON.parse(cleaned);}catch(e){}
  let first=cleaned.indexOf('{'), last=cleaned.lastIndexOf('}');
  if(first===-1||last===-1||last<first)return{actions:[],message:'Invalid JSON. Please re-try.'};
  let sub=cleaned.slice(first,last+1);
  try{return JSON.parse(sub);}catch(e){}
  return{actions:[],message:'Invalid JSON. Please re-try.'};
};

// ADAPT ACTION: unify AI keys
const adaptAction=a=>{
  if(a.add)return{type:'ADD',...a.add};
  if(a.action){
    return{
      type:a.action.toUpperCase(),
      id:a.id,text:a.text,priority:a.priority,dueDate:a.dueDate
    };
  }
  return a;
};

// RENDER TODOS
function renderTodos(){
  log('ui','Rendering todos...');
  let tb=document.getElementById('todo-list');
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
    c.checked=!!td.completed;
    let cells=tr.querySelectorAll('td');
    cells[1].textContent=td.text||'';
    cells[2].textContent=((td.priority||'')+(td.dueDate?(' | '+td.dueDate):''));
  });
}
// RENDER CHAT
function renderChat(){
  let area=document.getElementById('chat-area');
  area.innerHTML=chatHistory.map(m=>`<div class="message ${m.role}">${m.content}</div>`).join('');
  area.scrollTop=area.scrollHeight;
}

// STORAGE
const loadTodos=async()=>{
  log('storage','Loading...');
  try{
    let s=await Superpowers.storage.local.get('todos');
    todos=s.todos||[];
    renderTodos();
    log('storage','Todos loaded',todos);
  }catch(e){log('error','Load fail',e);showStatus('Failed to load','error');}
};
const saveTodos=async()=>{
  log('storage','Saving',todos);
  try{
    await Superpowers.storage.local.set({todos});
    renderTodos();
    log('storage','Saved todos');
  }catch(e){log('error','Save error',e);showStatus('Failed to save','error');}
};

// BASIC TODO OPS
window.addTodo=async()=>{
  let inp=document.getElementById('new-todo');
  let v=inp.value.trim();
  if(!v)return;
  todos.push({id:Date.now(),text:v,completed:false,priority:'medium',created:new Date().toISOString()});
  await saveTodos();
  inp.value='';
};
window.toggleTodo=async i=>{
  todos[i].completed=!todos[i].completed; 
  todos[i].modifiedAt=new Date().toISOString();
  await saveTodos();
};
window.deleteTodo=async i=>{
  todos.splice(i,1);
  await saveTodos();
};
window.editTodo=async i=>{
  let n=prompt('Edit todo:',todos[i].text);
  if(n&&n.trim()){
    todos[i].text=n.trim();
    todos[i].modifiedAt=new Date().toISOString();
    await saveTodos();
  }
};

// AI
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
  if(t)t.remove();
}
async function sendChat(){
  if(isProcessing)return;
  let inp=document.getElementById('chat-message');
  let m=inp.value.trim();
  if(!m)return;
  log('chat','Send msg',m);
  isProcessing=true; 
  document.getElementById('send-button').disabled=true;
  chatHistory.push({role:'user',content:m});
  renderChat();
  inp.value='';
  try{
    showThinking();
    let c=getModelCfg(currentModel);
    let r=await Superpowers.OpenAI.chatCompletion({
      model:currentModel,
      messages:[
        {role:'system',content:`You are a helpful todo assistant. Current todos: ${JSON.stringify(todos,null,2)}
Return valid JSON like: {"actions":[...],"message":"..."}`
        },
        ...chatHistory
      ],
      response_format:{type:'json_object'},
      max_completion_tokens:c.maxTokens,
      temperature:c.temperature
    });
    hideThinking();
    log('ai','Raw AI',r);
    if(r.choices[0].finish_reason==='length'){
      log('warn','Truncated!');
      showStatus('Truncated. Try shorter instructions','error');
    }
    let obj=parseAIJSON(r.choices[0].message.content);
    log('action','Parsed AI',obj);
    if(Array.isArray(obj.actions)){
      for(let a of obj.actions){
        let x=adaptAction(a);
        await handleAIAction(x);
      }
    }
    chatHistory.push({role:'assistant',content:obj.message||'(No message)'});
    renderChat();
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
async function handleAIAction(ac){
  log('action','Handle',ac);
  let {type,id,text,priority,dueDate}=ac;
  if(type==='ADD'){
    todos.push({id:Date.now(),text:text||'Untitled',completed:false,priority:priority||'medium',dueDate:dueDate||null,created:new Date().toISOString()});
  }else if(type==='EDIT'){
    let i=todos.findIndex(t=>t.id===id);
    if(i>-1){
      if(text)todos[i].text=text;
      if(priority)todos[i].priority=priority;
      if(dueDate)todos[i].dueDate=dueDate;
      todos[i].modifiedAt=new Date().toISOString();
    }
  }else if(type==='DELETE'){
    todos=todos.filter(t=>t.id!==id);
  }else if(type==='TOGGLE'){
    let it=todos.find(t=>t.id===id);
    if(it){it.completed=!it.completed;it.modifiedAt=new Date().toISOString();}
  }
  await saveTodos();
}

// MODEL SELECT
document.getElementById('modelSelect').addEventListener('change',e=>{
  currentModel=e.target.value;
  log('model',`Switched to ${currentModel}`);
});

// DEBUG
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key==='D'){
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
      if(window.Superpowers)return resolve();
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
    document.getElementById('modelSelect').value=currentModel;
    let c=getModelCfg(currentModel);
    log('model',`Using ${currentModel} => maxTok=${c.maxTokens},temp=${c.temperature}`);
    await Superpowers.OpenAI.test();
    showStatus('AI assistant ready','success');
  }catch(e){
    log('error','Key invalid',e);
    showStatus('Set API key','error');
    if(Superpowers.sidePanel&&Superpowers.sidePanel.open)Superpowers.sidePanel.open();
  }
  await loadTodos();
  if(!todos.length){
    todos.push({id:Date.now(),text:'Welcome! Ask AI to manage your todos',completed:false,priority:'medium',created:new Date().toISOString()});
    await saveTodos();
  }
  log('init','Started ok');
})();

document.getElementById('send-button').addEventListener('click',sendChat);
document.getElementById('chat-message').addEventListener('keypress',e=>{if(e.key==='Enter')sendChat();});
</script>
</body>
</html>

```

_Generated from source on 2025-01-23T16:06:13.728Z_

----
## Final Notes
----

1. Above is the newly generated plugin documentation.
2. The old Readme-LLM.md (if any) is archived in `Documentation/Archive/`.
3. Happy coding with Superpowers! 
