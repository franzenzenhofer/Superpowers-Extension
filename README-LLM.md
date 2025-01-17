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

By adding the meta tag, the content script sees that your page wants superpowers, pings the service worker to ensure it’s awake, then dynamically injects each plugin’s `page.js`.

----
# Superpowers Plugins Documentation

> Auto-generated plugin documentation


### superasyncrandominteger
Type: Bridge
Purpose: Provides asynchronous generation of random integers within a specified range. Bridges communication between a web page and a Chrome extension content script.

### Public API

#### Superpowers.asyncRandomInteger(timeMs, minVal, maxVal)
- Purpose: Generates a random integer asynchronously after a specified delay.
- Input: 
  - `timeMs` (number): The delay in milliseconds before the random integer is generated. Example values: `1000`, `5000`.
  - `minVal` (number): The minimum value of the range (inclusive) for the random integer. Example values: `1`, `10`.
  - `maxVal` (number): The maximum value of the range (inclusive) for the random integer. Example values: `100`, `1000`.
- Returns: A Promise that resolves to a random integer within the specified range `[minVal, maxVal]`.
- Example:
  ```javascript
  Superpowers.asyncRandomInteger(2000, 1, 100)
    .then((randomInt) => {
      console.log(`Generated random integer: ${randomInt}`);
    })
    .catch((error) => {
      console.error(`Error generating random integer: ${error}`);
    });
  ```

This method is the primary interface for users to asynchronously generate random integers within a specified range, with a delay defined by the user. It leverages the Chrome extension messaging system to handle requests and responses between the web page and the extension's background script.

### superaction
Type: Bridge
Purpose: The Superpowers superaction plugin serves as a bridge between a web page, content script, and service worker to facilitate communication and interaction with the `chrome.action` API. It enables the invocation of `chrome.action` methods and the handling of events across these components.

### Public API

#### Superpowers.action.methodName(...args)
- Purpose: Invoke a method on the `chrome.action` API from a web page.
- Input:
  - `methodName` (string): The name of the `chrome.action` method to be invoked. Example values: `"setBadgeText"`, `"setIcon"`.
  - `...args` (any[]): Arguments required by the specified `chrome.action` method. The arguments vary based on the method being called.
- Returns: A `Promise` that resolves with the result of the `chrome.action` method call or rejects with an error message if the call fails.
- Example:
  ```javascript
  Superpowers.action.setBadgeText({ text: "New" })
    .then(result => console.log("Badge text set successfully"))
    .catch(error => console.error("Error setting badge text:", error));
  ```

#### Superpowers.action.on(eventName, callback)
- Purpose: Register an event listener for a specific `chrome.action` event.
- Input:
  - `eventName` (string): The name of the event to listen for. Example values: `"onClicked"`.
  - `callback` (function): The function to be executed when the event is triggered. The callback receives event-specific arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.action.on("onClicked", (tab) => {
    console.log("Action button clicked in tab:", tab);
  });
  ```

#### Superpowers.action.off(eventName, callback)
- Purpose: Unregister a previously registered event listener for a specific `chrome.action` event.
- Input:
  - `eventName` (string): The name of the event for which the listener should be removed. Example values: `"onClicked"`.
  - `callback` (function): The function that was previously registered as a listener.
- Returns: `void`
- Example:
  ```javascript
  const handleClick = (tab) => {
    console.log("Action button clicked in tab:", tab);
  };
  
  Superpowers.action.on("onClicked", handleClick);
  // Later, to remove the listener:
  Superpowers.action.off("onClicked", handleClick);
  ```

This documentation provides a detailed overview of the Superpowers superaction plugin's public API, enabling developers to effectively utilize its bridging capabilities with the `chrome.action` API.

### superdebug
Type: Bridge
Purpose: The Superpowers superdebug plugin serves as a bridge between a web page's JavaScript context and a browser extension's background and sidepanel contexts. It facilitates logging and debugging by capturing logs from the page and forwarding them to a sidepanel for display.

### Public API

#### Superpowers.debugLog(msg, level = "info", domElementOrSelector)
- Purpose: To log messages from the web page to the console, optionally append them to a DOM element, and forward them to the browser extension's sidepanel.
- Input: 
  - `msg` (any): The message to be logged. It can be any data type (object, array, string, etc.). The message will be converted to a readable string using `toPrintable`.
  - `level` (string, optional): The severity level of the log. Possible values are "info", "error", "warn", "warning", "debug". Defaults to "info".
  - `domElementOrSelector` (string|HTMLElement, optional): A DOM element or a CSS selector string where the log message should be appended. If provided, the message will be appended to the specified element.
- Returns: None
- Example:
  ```javascript
  // Log a simple message
  Superpowers.debugLog("This is an informational message.");

  // Log an error message
  Superpowers.debugLog("This is an error message.", "error");

  // Log a message and append it to a DOM element with id 'log-container'
  Superpowers.debugLog("This is a warning message.", "warn", "#log-container");

  // Log a complex object
  Superpowers.debugLog({ key: "value", anotherKey: [1, 2, 3] }, "debug");
  ```

This method is the primary interface for logging within the Superpowers superdebug plugin. It ensures that messages are appropriately formatted, logged to the console, optionally appended to the DOM, and forwarded to the extension's background script for further processing and display in the sidepanel.

### superdebugger
Type: Bridge
Purpose: The superdebugger plugin acts as a bridge between a web page and the Chrome debugger API, facilitating communication and debugging operations through a structured messaging system.

### Public API

#### Superpowers.debugger.on(eventName, callback)
- Purpose: Registers an event listener for debugger events.
- Input:
  - eventName (string): The name of the event to listen for. Valid values are 'onDetach' and 'onEvent'.
  - callback (function): The function to be called when the event occurs.
- Returns: void
- Example:
  ```javascript
  Superpowers.debugger.on('onEvent', (source, method, params) => {
    console.log('Debugger event:', method, params);
  });
  ```

#### Superpowers.debugger.off(eventName, callback)
- Purpose: Removes an event listener for debugger events.
- Input:
  - eventName (string): The name of the event to stop listening for. Valid values are 'onDetach' and 'onEvent'.
  - callback (function): The function that was previously registered as a listener.
- Returns: void
- Example:
  ```javascript
  const myCallback = (source, method, params) => {
    console.log('Debugger event:', method, params);
  };
  Superpowers.debugger.on('onEvent', myCallback);
  Superpowers.debugger.off('onEvent', myCallback);
  ```

#### Superpowers.debugger.<methodName>(...args)
- Purpose: Calls a specified method on the Chrome debugger API.
- Input:
  - methodName (string): The name of the Chrome debugger method to call. Valid methods include 'attach', 'detach', 'sendCommand', and 'getTargets'.
  - args (array): The arguments required by the specified method.
- Returns: Promise<any> - Resolves with the result of the method call or rejects with an error.
- Example:
  ```javascript
  Superpowers.debugger.attach({ tabId: 123 }, '1.3')
    .then(() => {
      console.log('Debugger attached');
    })
    .catch(err => {
      console.error('Failed to attach debugger:', err);
    });
  ```

### Notes
- The `Superpowers.debugger` API provides a proxy to interact with the Chrome debugger, ensuring that all method calls and event registrations are validated and handled with comprehensive error checking.
- Ensure that the debugger interface is initialized before making any calls by checking the `STATE.initialized` flag.
- Event listeners must be registered before the corresponding events occur to capture them effectively.

### superfetch
Type: Utility
Purpose: Provides enhanced fetch capabilities with extended timeout settings and additional response handling features. It bridges web page requests to a service worker for network operations, enabling advanced fetch operations beyond the standard `fetch` API.

### Public API

#### Superpowers.setSuperfetchTimeout(ms)
- Purpose: Sets the timeout duration for superfetch requests.
- Input: 
  - `ms` (number): Timeout duration in milliseconds. Example values: `60000` for 1 minute, `120000` for 2 minutes.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.setSuperfetchTimeout(90000); // Sets timeout to 90 seconds
  ```

#### Superpowers.whatsGoingOn()
- Purpose: Retrieves a list of active superfetch requests.
- Input: None
- Returns: `Array` of active request objects, each containing `requestId`, `url`, and `startTime`.
- Example:
  ```javascript
  const activeRequests = Superpowers.whatsGoingOn();
  console.log(activeRequests);
  ```

#### Superpowers.fetch(url, options)
- Purpose: Performs a fetch request with extended capabilities and timeout handling.
- Input: 
  - `url` (string): The URL to fetch. Example: `"https://api.example.com/data"`.
  - `options` (object, optional): Fetch options similar to the standard `fetch` API. Example: `{ method: 'GET', headers: { 'Content-Type': 'application/json' } }`.
- Returns: `Promise` that resolves to an enhanced response object containing:
  - `status` (number): HTTP status code.
  - `statusText` (string): HTTP status text.
  - `ok` (boolean): True if status is in the range 200-299.
  - `redirected` (boolean): True if the request was redirected.
  - `url` (string): Final URL after redirects.
  - `type` (string): Response type.
  - `headers` (object): Response headers.
  - `text()`, `json()`, `blob()`, `arrayBuffer()`: Methods to retrieve the response body in different formats.
  - `_superfetch`: Additional metadata including `requestId`, `timestamp`, `rawHeaders`, `rawBody`, and performance metrics.
- Example:
  ```javascript
  Superpowers.fetch('https://api.example.com/data', { method: 'GET' })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Network response was not ok');
      }
    })
    .then(data => console.log(data))
    .catch(error => console.error('Fetch error:', error));
  ```

### superpages
Type: Bridge
Purpose: Facilitates communication between a web page and a browser extension, enabling the creation of downloadable content blobs from web page data.

### Public API

#### Superpowers.pages(content, options)
- Purpose: To create a downloadable blob URL from the provided content, allowing the user to download or use the content as a file.
- Input:
  - `content` (string): The content to be converted into a downloadable blob. Example values: `"<html><body>Hello World!</body></html>"`.
  - `options` (object, optional): Additional parameters to customize the blob creation.
    - `filename` (string, optional): The desired filename for the downloadable content. Example values: `"example.html"`.
    - `mimeType` (string, optional): The MIME type of the content. Example values: `"text/html"`, `"application/json"`.
- Returns: A Promise that resolves to a string URL of the created blob. If an error occurs, the Promise is rejected with an error message.
- Example:
  ```javascript
  Superpowers.pages("<html><body>Hello World!</body></html>", { filename: "example.html", mimeType: "text/html" })
    .then((url) => {
      console.log("Blob URL created:", url);
      // Use the URL to download or display the content
    })
    .catch((error) => {
      console.error("Error creating blob:", error);
    });
  ```

This method is the primary interface for using the Superpowers superpages plugin, allowing seamless integration between web page content and browser extension capabilities.

### gsc
Type: Bridge
Purpose: The gsc plugin serves as a bridge between a web page and the Google Search Console (GSC) API. It facilitates communication by relaying method calls and responses between the page, service worker, and GSC API, allowing users to interact with GSC functionalities directly from their web applications.

### Public API

#### login(customCreds)
- Purpose: Initiates a login process to Google Search Console using OAuth credentials.
- Input:
  - `customCreds` (object): Optional credentials object with properties like `service`, `clientSecretType`, and `tokenType`.
- Returns: Promise resolving to an object with success status and message.
- Example:
  ```javascript
  Superpowers.Gsc.login({ service: "google-searchconsole" })
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```
  
  Default always use
    ```javascript
  Superpowers.Gsc.login({ service: "google-searchconsole" })
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```
  
  But the user might tell you to use it with a string  to a stored credential, which also works
    ```javascript
  Superpowers.Gsc.login("superAuthCreds.google-searchconsole.client_secret.json")
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### getLoginStatus()
- Purpose: Retrieves the current login status.
- Input: None
- Returns: Boolean indicating login status.
- Example:
  ```javascript
  const status = Superpowers.Gsc.getLoginStatus();
  console.log(status);
  ```

#### test()
- Purpose: Tests the login functionality by attempting a login with default credentials.
- Input: None
- Returns: Promise resolving to an object with success status and message.
- Example:
  ```javascript
  Superpowers.Gsc.test()
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### listSites()
- Purpose: Lists all sites associated with the authenticated user in GSC.
- Input: None
- Returns: Promise resolving to an array of site objects.
- Example:
  ```javascript
  Superpowers.Gsc.listSites()
    .then(sites => console.log(sites))
    .catch(error => console.error(error));
  ```

#### getSiteInfo(siteUrl)
- Purpose: Retrieves information about a specific site.
- Input:
  - `siteUrl` (string): URL of the site to retrieve information for.
- Returns: Promise resolving to a site object.
- Example:
  ```javascript
  Superpowers.Gsc.getSiteInfo("https://example.com")
    .then(site => console.log(site))
    .catch(error => console.error(error));
  ```

#### querySearchAnalytics(siteUrl, queryBody)
- Purpose: Queries search analytics data for a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `queryBody` (object): Query parameters including `startDate`, `endDate`, and `dimensions`.
- Returns: Promise resolving to analytics data.
- Example:
  ```javascript
  Superpowers.Gsc.querySearchAnalytics("https://example.com", { startDate: "2023-01-01", endDate: "2023-01-31", dimensions: ["query"] })
    .then(data => console.log(data))
    .catch(error => console.error(error));
  ```

#### submitSitemap(siteUrl, sitemapUrl)
- Purpose: Submits a sitemap for a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `sitemapUrl` (string): URL of the sitemap.
- Returns: Promise resolving to a success status.
- Example:
  ```javascript
  Superpowers.Gsc.submitSitemap("https://example.com", "https://example.com/sitemap.xml")
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### deleteSitemap(siteUrl, sitemapUrl)
- Purpose: Deletes a sitemap from a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `sitemapUrl` (string): URL of the sitemap.
- Returns: Promise resolving to a success status.
- Example:
  ```javascript
  Superpowers.Gsc.deleteSitemap("https://example.com", "https://example.com/sitemap.xml")
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### listSitemaps(siteUrl)
- Purpose: Lists all sitemaps for a site.
- Input:
  - `siteUrl` (string): URL of the site.
- Returns: Promise resolving to an array of sitemap objects.
- Example:
  ```javascript
  Superpowers.Gsc.listSitemaps("https://example.com")
    .then(sitemaps => console.log(sitemaps))
    .catch(error => console.error(error));
  ```

#### addSite(siteUrl)
- Purpose: Adds a new site to GSC.
- Input:
  - `siteUrl` (string): URL of the site to add.
- Returns: Promise resolving to a success status.
- Example:
  ```javascript
  Superpowers.Gsc.addSite("https://newsite.com")
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### deleteSite(siteUrl)
- Purpose: Deletes a site from GSC.
- Input:
  - `siteUrl` (string): URL of the site to delete.
- Returns: Promise resolving to a success status.
- Example:
  ```javascript
  Superpowers.Gsc.deleteSite("https://example.com")
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

#### getSite(siteUrl)
- Purpose: Retrieves a site from GSC.
- Input:
  - `siteUrl` (string): URL of the site to retrieve.
- Returns: Promise resolving to a site object.
- Example:
  ```javascript
  Superpowers.Gsc.getSite("https://example.com")
    .then(site => console.log(site))
    .catch(error => console.error(error));
  ```

#### getSitemap(siteUrl, sitemapUrl)
- Purpose: Retrieves a specific sitemap for a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `sitemapUrl` (string): URL of the sitemap.
- Returns: Promise resolving to a sitemap object.
- Example:
  ```javascript
  Superpowers.Gsc.getSitemap("https://example.com", "https://example.com/sitemap.xml")
    .then(sitemap => console.log(sitemap))
    .catch(error => console.error(error));
  ```

#### getTopQueries(siteUrl, options)
- Purpose: Retrieves the top search queries for a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `options` (object): Optional parameters like `startDate`, `endDate`, and `rowLimit`.
- Returns: Promise resolving to query data.
- Example:
  ```javascript
  Superpowers.Gsc.getTopQueries("https://example.com", { startDate: "2023-01-01", endDate: "2023-01-31" })
    .then(queries => console.log(queries))
    .catch(error => console.error(error));
  ```

#### getTopPages(siteUrl, options)
- Purpose: Retrieves the top pages for a site.
- Input:
  - `siteUrl` (string): URL of the site.
  - `options` (object): Optional

### superpingasync
Type: Bridge
Purpose: Facilitates asynchronous communication between a web page and a Chrome extension by bridging messages from the page to the extension and back.

### Public API

#### asyncPing(message)
- Purpose: Sends an asynchronous ping message from the web page to the extension and receives a response.
- Input: 
  - message (string): The message to be sent to the extension. Example values: "Hello", "Ping", "Test message".
- Returns: Promise<string> - Resolves with the response message from the extension. The response is prefixed with "Pong: " followed by the original message or "no message" if the message is undefined.
- Example:
  ```javascript
  window.Superpowers.asyncPing("Hello").then(response => {
    console.log(response); // Outputs: "Pong: Hello"
  }).catch(error => {
    console.error("Error:", error);
  });
  ```

This method is the primary interface for using the superpingasync plugin. It handles the communication by sending a message from the web page, through the content script, to the extension, and waits for a response. The response is processed asynchronously, allowing for non-blocking operations on the web page.

### superenv
Type: Bridge
Purpose: Provides a bridge between web pages and Chrome extensions for managing environment variables and logging debug messages.

### Public API

#### getEnvVars()
- Purpose: Retrieve the default set of environment variables.
- Input: None
- Returns: Promise<Object> - An object containing the environment variables.
- Example:
  ```javascript
  window.Superpowers.getEnvVars().then(vars => {
    console.log(vars);
  }).catch(error => {
    console.error(error);
  });
  ```

#### setEnvVars()
- Purpose: Deprecated method for setting environment variables.
- Input: None
- Returns: Promise<Object> - An object indicating failure with an error message.
- Example:
  ```javascript
  window.Superpowers.setEnvVars().then(response => {
    console.warn(response.error);
  });
  ```

#### listEnvSets()
- Purpose: List all environment variable sets.
- Input: None
- Returns: Promise<Object> - An object containing all environment variable sets.
- Example:
  ```javascript
  window.Superpowers.listEnvSets().then(envSets => {
    console.log(envSets);
  }).catch(error => {
    console.error(error);
  });
  ```

#### getEnvSet(envName)
- Purpose: Retrieve a specific set of environment variables by name.
- Input:
  - envName (string): The name of the environment set to retrieve.
- Returns: Promise<Object> - An object containing the specified environment variables.
- Example:
  ```javascript
  window.Superpowers.getEnvSet('development').then(vars => {
    console.log(vars);
  }).catch(error => {
    console.error(error);
  });
  ```

#### setEnvSet(envName, varsObj)
- Purpose: Set a specific set of environment variables by name.
- Input:
  - envName (string): The name of the environment set to update.
  - varsObj (Object): An object containing the variables to set.
- Returns: Promise<Object> - An object indicating success.
- Example:
  ```javascript
  window.Superpowers.setEnvSet('development', { key: 'value' }).then(response => {
    console.log(response);
  }).catch(error => {
    console.error(error);
  });
  ```

#### deleteEnvSet(envName)
- Purpose: Delete a specific set of environment variables by name.
- Input:
  - envName (string): The name of the environment set to delete.
- Returns: Promise<Object> - An object indicating success or failure.
- Example:
  ```javascript
  window.Superpowers.deleteEnvSet('development').then(response => {
    console.log(response);
  }).catch(error => {
    console.error(error);
  });
  ```

#### debugLog(message, level, source)
- Purpose: Log a debug message with a specified level and source.
- Input:
  - message (string): The debug message to log.
  - level (string, optional): The severity level of the log (default: "info").
  - source (string, optional): The source of the log message (default: "page").
- Returns: None
- Example:
  ```javascript
  window.Superpowers.debugLog('This is a debug message', 'warn', 'myModule');
  ```

### superping
Type: Bridge
Purpose: Facilitates synchronous communication from a web page to a service worker (SW) using the "SUPERPING" message type. It bridges the web page context to the service worker context via a content script.

### Public API

#### Superpowers.ping(msg)
- Purpose: Sends a "SUPERPING" message from the web page to the service worker and returns the message synchronously from the page's perspective.
- Input: 
  - `msg` (string): The message to be sent. It can be any string value, e.g., "Hello, World!" or "Ping Test".
- Returns: 
  - `string`: The same `msg` value that was passed as input.
- Example:
  ```javascript
  // Usage in the web page context
  const response = Superpowers.ping("Test Message");
  console.log(response); // Outputs: "Test Message"
  ```

### Explanation
- The `Superpowers.ping` function is designed to appear synchronous to the caller, immediately returning the input `msg`.
- Internally, it posts a message to the content script, which forwards it to the service worker.
- The service worker logs the message and responds with a success status, but this response is not relayed back to the page, maintaining the synchronous illusion for the caller.

### superruntime
Type: Bridge
Purpose: The `superruntime` plugin serves as a bridge between web pages and the Chrome extension's background service, enabling communication and interaction with the Chrome runtime API.

### Public API

#### Superpowers.runtime.on(eventName, callback)
- Purpose: Registers an event listener for Chrome runtime events.
- Input:
  - `eventName` (string): The name of the Chrome runtime event to listen for. Examples include `onStartup`, `onInstalled`, etc.
  - `callback` (function): The function to be executed when the event is triggered. Receives event-specific arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.runtime.on('onInstalled', (details) => {
    console.log('Extension installed:', details);
  });
  ```

#### Superpowers.runtime.off(eventName, callback)
- Purpose: Unregisters an event listener for Chrome runtime events.
- Input:
  - `eventName` (string): The name of the Chrome runtime event to stop listening for.
  - `callback` (function): The function to be removed from the event's listener list.
- Returns: `void`
- Example:
  ```javascript
  const handleInstalled = (details) => {
    console.log('Extension installed:', details);
  };
  Superpowers.runtime.on('onInstalled', handleInstalled);
  Superpowers.runtime.off('onInstalled', handleInstalled);
  ```

#### Superpowers.runtime.<methodName>(...args)
- Purpose: Calls a method from the Chrome runtime API.
- Input:
  - `methodName` (string): The name of the Chrome runtime method to invoke. Examples include `getBackgroundPage`, `sendMessage`, etc.
  - `...args` (any[]): Arguments to pass to the Chrome runtime method.
- Returns: `Promise<any>`: Resolves with the result of the method call or rejects with an error message.
- Example:
  ```javascript
  Superpowers.runtime.sendMessage({ greeting: "hello" })
    .then(response => {
      console.log('Response:', response);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  ```

### Notes
- The `Superpowers.runtime` object is a proxy that facilitates method calls to the Chrome runtime API. It supports both promise-based and callback-based methods, automatically handling the appropriate invocation style.
- Event listeners registered with `on` will receive arguments specific to the event type, as provided by the Chrome runtime API.
- Ensure that the `Superpowers` object is available in the global scope before attempting to use these methods.

### superopenai
Type: Bridge
Purpose: Facilitates communication between a web page and the OpenAI API via a browser extension, enabling functionalities such as chat completions, image generation, audio processing, and more.

### Public API

#### test()
- Purpose: Test the connection and functionality of the plugin.
- Input: None
- Returns: Promise resolving to a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.test().then(console.log).catch(console.error);
  ```

#### chatCompletion(payload)
- Purpose: Generate a chat completion using OpenAI's models.
- Input:
  - payload (object): Contains parameters such as `model`, `messages`, `max_tokens`, etc.
- Returns: Promise resolving to the chat completion result.
- Example:
  ```javascript
  Superpowers.OpenAI.chatCompletion({ model: "gpt-4", messages: [{ role: "user", content: "Hello!" }] })
    .then(console.log).catch(console.error);
  ```

#### chatCompletionStream(payload)
- Purpose: Stream chat completions using Server-Sent Events (SSE).
- Input:
  - payload (object): Contains parameters such as `model`, `messages`, etc.
- Returns: Promise resolving when the stream ends.
- Example:
  ```javascript
  Superpowers.OpenAI.chatCompletionStream({ model: "gpt-4", messages: [{ role: "user", content: "Hello!" }] })
    .then(console.log).catch(console.error);
  ```

#### imageGeneration(payload)
- Purpose: Generate images based on a prompt.
- Input:
  - payload (object): Contains parameters such as `model`, `prompt`, `size`, etc.
- Returns: Promise resolving to the generated image data.
- Example:
  ```javascript
  Superpowers.OpenAI.imageGeneration({ model: "dall-e-3", prompt: "A futuristic cityscape" })
    .then(console.log).catch(console.error);
  ```

#### structuredCompletion(payload)
- Purpose: Generate structured completions.
- Input:
  - payload (object): Contains parameters such as `model`, `messages`, `responseFormat`, etc.
- Returns: Promise resolving to the structured completion result.
- Example:
  ```javascript
  Superpowers.OpenAI.structuredCompletion({ model: "gpt-4o", messages: [{ role: "user", content: "Summarize this text." }] })
    .then(console.log).catch(console.error);
  ```

#### functionCall(payload)
- Purpose: Execute function calls using OpenAI's models.
- Input:
  - payload (object): Contains parameters such as `model`, `tools`, `toolChoice`, etc.
- Returns: Promise resolving to the function call result.
- Example:
  ```javascript
  Superpowers.OpenAI.functionCall({ model: "gpt-4o", tools: ["calculator"], toolChoice: "calculator" })
    .then(console.log).catch(console.error);
  ```

#### setApiKey(key)
- Purpose: Set the API key for OpenAI.
- Input:
  - key (string): The API key.
- Returns: Promise resolving to a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.setApiKey("your-api-key").then(console.log).catch(console.error);
  ```

#### setOrganizationId(orgId)
- Purpose: Set the organization ID for OpenAI.
- Input:
  - orgId (string): The organization ID.
- Returns: Promise resolving to a success message.
- Example:
  ```javascript
  Superpowers.OpenAI.setOrganizationId("your-org-id").then(console.log).catch(console.error);
  ```

#### audioSpeech(payload)
- Purpose: Convert text to speech.
- Input:
  - payload (object): Contains parameters such as `model`, `input`, `voice`, etc.
- Returns: Promise resolving to the audio data.
- Example:
  ```javascript
  Superpowers.OpenAI.audioSpeech({ model: "tts-1", input: "Hello world" })
    .then(console.log).catch(console.error);
  ```

#### audioTranscription(payload)
- Purpose: Transcribe audio files to text.
- Input:
  - payload (object): Contains parameters such as `file`, `model`, `language`, etc.
- Returns: Promise resolving to the transcription result.
- Example:
  ```javascript
  Superpowers.OpenAI.audioTranscription({ file: audioFile, model: "whisper-1" })
    .then(console.log).catch(console.error);
  ```

#### audioTranslation(payload)
- Purpose: Translate audio files.
- Input:
  - payload (object): Contains parameters such as `file`, `model`, etc.
- Returns: Promise resolving to the translation result.
- Example:
  ```javascript
  Superpowers.OpenAI.audioTranslation({ file: audioFile, model: "whisper-1" })
    .then(console.log).catch(console.error);
  ```

#### embeddings(payload)
- Purpose: Generate embeddings for text input.
- Input:
  - payload (object): Contains parameters such as `model`, `input`, etc.
- Returns: Promise resolving to the embeddings data.
- Example:
  ```javascript
  Superpowers.OpenAI.embeddings({ model: "text-embedding-ada-002", input: "Hello world" })
    .then(console.log).catch(console.error);
  ```

#### fineTuneCreate(payload)
- Purpose: Create a fine-tuning job.
- Input:
  - payload (object): Contains parameters such as `model`, `training_file`, etc.
- Returns: Promise resolving to the fine-tuning job details.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneCreate({ model: "gpt-4o-mini", training_file: "file-id" })
    .then(console.log).catch(console.error);
  ```

#### fineTuneList(payload)
- Purpose: List fine-tuning jobs.
- Input:
  - payload (object): Contains optional parameters such as `after`, `limit`, etc.
- Returns: Promise resolving to the list of fine-tuning jobs.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneList({ limit: 10 })
    .then(console.log).catch(console.error);
  ```

#### fineTuneRetrieve(payload)
- Purpose: Retrieve details of a fine-tuning job.
- Input:
  - payload (object): Contains the `fine_tuning_job_id`.
- Returns: Promise resolving to the fine-tuning job details.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneRetrieve({ fine_tuning_job_id: "job-id" })
    .then(console.log).catch(console.error);
  ```

#### fineTuneCancel(payload)
- Purpose: Cancel a fine-tuning job.
- Input:
  - payload (object): Contains the `fine_tuning_job_id`.
- Returns: Promise resolving to the cancellation status.
- Example:
  ```javascript
  Superpowers.OpenAI.fineTuneCancel({ fine_tuning_job_id: "job-id" })
    .then(console.log).catch(console.error);
  ```

#### fineTuneListEvents(payload)
- Purpose: List events of a fine-tuning job.
- Input

### superscreenshot
Type: Utility
Purpose: Provides functionality to capture screenshots of web pages, either visible or full-page, in specified formats and qualities.

### Public API

#### Superpowers.screenshot(payload)
- Purpose: Captures a screenshot based on the provided configuration.
- Input: 
  - `payload` (object): Configuration object for the screenshot.
    - `url` (string, optional): The URL to open for the screenshot. Required if `tabId` is not provided.
    - `tabId` (number, optional): The tab ID to capture. Required if `url` is not provided.
    - `captureMode` (string, optional): Capture mode, either `"visible"` or `"full"`. Defaults to `"visible"`.
    - `format` (string, optional): Image format, either `"png"` or `"jpeg"`. Defaults to `"png"`.
    - `quality` (number, optional): Quality for JPEG format, ranging from 0 to 100. Ignored if format is PNG. Defaults to 100.
    - `delayMs` (number, optional): Delay in milliseconds before capture. Defaults to 1000 ms.
    - `keepTabOpen` (boolean, optional): If `true`, the newly created tab/window will not be closed after capture. Defaults to `false`.
    - `width` (number, optional): Desired window width if creating a new window.
    - `height` (number, optional): Desired window height if creating a new window.
    - `injectCss` (string, optional): CSS string to inject into the page before capture.
    - `injectJs` (string, optional): JavaScript string to inject into the page before capture.
- Returns: `Promise<string>` - Resolves with a data URL string of the screenshot if successful, or rejects with an error message.
- Example:
  ```javascript
  Superpowers.screenshot({
    url: "https://example.com",
    captureMode: "full",
    format: "jpeg",
    quality: 80,
    delayMs: 2000,
    injectCss: "body { background-color: red; }",
    injectJs: "console.log('Page loaded');"
  })
  .then(dataUrl => {
    console.log("Screenshot captured:", dataUrl);
  })
  .catch(error => {
    console.error("Screenshot failed:", error);
  });
  ```

This function is the primary interface for capturing screenshots using the Superpowers plugin. It handles the entire process, from opening a new tab or using an existing one, to capturing the screenshot and returning the result as a data URL.

### supertabs
Type: Bridge
Purpose: The supertabs plugin serves as a bridge between web pages and Chrome's `chrome.tabs` API. It facilitates communication between the page, content script, and service worker, allowing web pages to interact with browser tabs and listen for tab-related events.

### Public API

#### Superpowers.tabs.query(queryInfo)
- Purpose: Retrieve all tabs that match the specified properties.
- Input:
  - `queryInfo` (object): An object specifying properties to match against tabs. Example properties include `active`, `currentWindow`, `highlighted`, etc.
- Returns: Promise resolving to an array of `Tab` objects.
- Example:
  ```javascript
  Superpowers.tabs.query({ active: true, currentWindow: true })
    .then(tabs => console.log(tabs))
    .catch(error => console.error(error));
  ```

#### Superpowers.tabs.create(createProperties)
- Purpose: Create a new tab with the specified properties.
- Input:
  - `createProperties` (object): An object specifying properties for the new tab, such as `url`, `active`, `index`, etc.
- Returns: Promise resolving to a `Tab` object representing the created tab.
- Example:
  ```javascript
  Superpowers.tabs.create({ url: "https://www.example.com" })
    .then(tab => console.log(tab))
    .catch(error => console.error(error));
  ```

#### Superpowers.tabs.reload(tabId, reloadProperties)
- Purpose: Reload a tab with optional reload properties.
- Input:
  - `tabId` (integer): The ID of the tab to reload.
  - `reloadProperties` (object, optional): An object specifying reload options, such as `bypassCache`.
- Returns: Promise resolving when the tab has been reloaded.
- Example:
  ```javascript
  Superpowers.tabs.reload(123)
    .then(() => console.log("Tab reloaded"))
    .catch(error => console.error(error));
  ```

#### Superpowers.tabs.on(eventName, callback)
- Purpose: Attach an event listener for tab-related events.
- Input:
  - `eventName` (string): The name of the event to listen for, such as `onCreated`, `onUpdated`, `onRemoved`, etc.
  - `callback` (function): A function to be called when the event occurs, receiving event-specific arguments.
- Example:
  ```javascript
  Superpowers.tabs.on("onCreated", (tab) => {
    console.log("Tab created:", tab);
  });
  ```

#### Superpowers.tabs.off(eventName, callback)
- Purpose: Detach a previously attached event listener.
- Input:
  - `eventName` (string): The name of the event for which the listener was attached.
  - `callback` (function): The function that was previously attached as a listener.
- Example:
  ```javascript
  function onTabCreated(tab) {
    console.log("Tab created:", tab);
  }
  Superpowers.tabs.on("onCreated", onTabCreated);
  // Later, to remove the listener:
  Superpowers.tabs.off("onCreated", onTabCreated);
  ```

### Notes
- The `Superpowers.tabs` object is dynamically created using a Proxy, allowing any method from `chrome.tabs` to be called directly. If a method is not explicitly documented, it can still be accessed in the same manner as the documented methods.
- All methods return Promises, ensuring asynchronous operations are handled smoothly.
- Event listeners are managed through the `on` and `off` methods, providing flexibility in handling tab events.

### superwebnavigation
Type: Bridge
Purpose: Bridges web page interactions with the Chrome `chrome.webNavigation` API, enabling communication between a web page, content script, and service worker. It facilitates method calls and event handling related to web navigation.

### Public API

#### Superpowers.webNavigation.on(eventName, callback)
- Purpose: Registers an event listener for specific web navigation events.
- Input: 
  - `eventName` (string): The name of the web navigation event to listen for. Possible values include `"onBeforeNavigate"`, `"onCommitted"`, `"onDOMContentLoaded"`, `"onCompleted"`, `"onErrorOccurred"`.
  - `callback` (function): A function to be called when the event occurs. The function receives event details as arguments.
- Returns: `void`
- Example:
  ```javascript
  Superpowers.webNavigation.on("onCompleted", (details) => {
    console.log("Navigation completed:", details);
  });
  ```

#### Superpowers.webNavigation.off(eventName, callback)
- Purpose: Unregisters an event listener for specific web navigation events.
- Input: 
  - `eventName` (string): The name of the web navigation event to stop listening for.
  - `callback` (function): The function that was previously registered as a callback.
- Returns: `void`
- Example:
  ```javascript
  function onCompletedCallback(details) {
    console.log("Navigation completed:", details);
  }
  
  Superpowers.webNavigation.on("onCompleted", onCompletedCallback);
  // Later, to remove the listener:
  Superpowers.webNavigation.off("onCompleted", onCompletedCallback);
  ```

#### Superpowers.webNavigation.methodName(...args)
- Purpose: Calls a method from the `chrome.webNavigation` API.
- Input: 
  - `methodName` (string): The name of the `chrome.webNavigation` method to call.
  - `...args` (varied): Arguments required by the specific `chrome.webNavigation` method.
- Returns: `Promise`: Resolves with the result of the method call or rejects with an error message.
- Example:
  ```javascript
  Superpowers.webNavigation.getAllFrames({tabId: 123})
    .then((frames) => {
      console.log("Frames:", frames);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  ```

### Notes
- The `Superpowers.webNavigation` object acts as a proxy to the `chrome.webNavigation` API, allowing dynamic method invocation.
- Ensure that the `methodName` corresponds to a valid function within the `chrome.webNavigation` API.
- Event listeners (`on` and `off`) are specifically designed to handle events broadcasted from the service worker to the content script and then to the page.

### superwebrequest
Type: Bridge
Purpose: The `superwebrequest` plugin bridges web requests between a web page and the Chrome Service Worker, enabling interaction with the `chrome.webRequest` API from the page context.

### Public API

#### Superpowers.webrequest.on(eventName, callback)
- Purpose: Register an event listener for a specific web request event.
- Input:
  - `eventName` (string): The name of the web request event to listen for. Possible values include:
    - `onBeforeRequest`
    - `onBeforeSendHeaders`
    - `onSendHeaders`
    - `onHeadersReceived`
    - `onAuthRequired`
    - `onResponseStarted`
    - `onBeforeRedirect`
    - `onCompleted`
    - `onErrorOccurred`
  - `callback` (function): A function to be called when the event is triggered. The function receives the event arguments.
- Returns: void
- Example:
  ```javascript
  Superpowers.webrequest.on('onBeforeRequest', (details) => {
    console.log('Request details:', details);
  });
  ```

#### Superpowers.webrequest.off(eventName, callback)
- Purpose: Unregister a previously registered event listener for a specific web request event.
- Input:
  - `eventName` (string): The name of the web request event.
  - `callback` (function): The function that was previously registered as a listener.
- Returns: void
- Example:
  ```javascript
  function handleRequest(details) {
    console.log('Request details:', details);
  }

  Superpowers.webrequest.on('onBeforeRequest', handleRequest);
  Superpowers.webrequest.off('onBeforeRequest', handleRequest);
  ```

#### Superpowers.webrequest.<methodName>(...args)
- Purpose: Call a method from the `chrome.webRequest` API.
- Input:
  - `methodName` (string): The name of the `chrome.webRequest` method to call, such as `handlerBehaviorChanged`.
  - `...args` (any): Arguments to pass to the specified method.
- Returns: Promise
  - Resolves with the result of the `chrome.webRequest` method call.
  - Rejects with an error message if the method call fails.
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

This documentation provides the necessary details for utilizing the `superwebrequest` plugin's public API. The plugin facilitates communication between the page and the Chrome Service Worker, allowing developers to handle web requests and interact with the `chrome.webRequest` API effectively.

### superurlget
Type: Bridge
Purpose: The `superurlget` plugin serves as a bridge between web pages and the Chrome extension environment, allowing for the retrieval of web page content through various methods. It facilitates communication between the page context and the content script, enabling operations such as fetching rendered pages, HTML, DOM, and text content.

### Public API

#### getRenderedPage(url, config)
- Purpose: Fetch the fully rendered page content, including HTML and text.
- Input: 
  - `url` (string): The URL of the page to fetch. Example: `https://example.com`.
  - `config` (object, optional): Configuration options for the fetch operation.
    - `waitForEvent` (string): Event to wait for before fetching. Default is `'DOMContentLoaded'`.
    - `timeoutMs` (number): Maximum wait time in milliseconds. Default is `30000`.
    - `injectCss` (string): CSS to inject before fetching. Example: `".hide { display: none; }"`.
    - `injectJs` (string): JavaScript to inject before fetching. Example: `"console.log('Hello');"`.
    - `fallbackDelay` (number): Minimum wait time if events fail. Default is `1000`.
- Returns: Promise<object> containing:
  - `title` (string): The page title.
  - `url` (string): The page URL.
  - `html` (string): The full HTML content.
  - `text` (string): The text content of the page.
- Example:
  ```javascript
  Superpowers.Urlget.getRenderedPage('https://example.com')
    .then(result => console.log(result))
    .catch(error => console.error(error));
  ```

#### getHtml(url, config)
- Purpose: Retrieve the HTML content of a page.
- Input: 
  - `url` (string): The URL of the page to fetch. Example: `https://example.com`.
  - `config` (object, optional): Configuration options (same as `getRenderedPage`).
- Returns: Promise<object> containing:
  - `html` (string): The full HTML content.
- Example:
  ```javascript
  Superpowers.Urlget.getHtml('https://example.com')
    .then(result => console.log(result.html))
    .catch(error => console.error(error));
  ```

#### getDom(url, config)
- Purpose: Fetch the DOM structure of a page as HTML.
- Input: 
  - `url` (string): The URL of the page to fetch. Example: `https://example.com`.
  - `config` (object, optional): Configuration options (same as `getRenderedPage`).
- Returns: Promise<object> containing:
  - `html` (string): The DOM structure as HTML.
- Example:
  ```javascript
  Superpowers.Urlget.getDom('https://example.com')
    .then(result => console.log(result.html))
    .catch(error => console.error(error));
  ```

#### getText(url, config)
- Purpose: Retrieve the text content of a page.
- Input: 
  - `url` (string): The URL of the page to fetch. Example: `https://example.com`.
  - `config` (object, optional): Configuration options (same as `getRenderedPage`).
- Returns: Promise<object> containing:
  - `text` (string): The text content of the page.
- Example:
  ```javascript
  Superpowers.Urlget.getText('https://example.com')
    .then(result => console.log(result.text))
    .catch(error => console.error(error));
  ``` 

This documentation provides a comprehensive guide to using the `superurlget` plugin's public API methods, ensuring effective integration and utilization within your projects.