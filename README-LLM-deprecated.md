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

## Function Reference
# Superpowers Plugins Documentation

> Auto-generated plugin documentation


### superasyncrandominteger
- **Plugin Purpose**: Provides asynchronous generation of random integers within a specified range after a delay.

### Public API Methods

#### asyncRandomInteger(timeMs, minVal, maxVal)
- **Description**: Generates a random integer between `minVal` and `maxVal` after a delay of `timeMs` milliseconds.
- **Parameters**:
  - `timeMs` (number): The delay in milliseconds before the random integer is generated, required.
  - `minVal` (number): The minimum value of the random integer range, required.
  - `maxVal` (number): The maximum value of the random integer range, required.
- **Returns**: `Promise<number>` - A promise that resolves to a random integer within the specified range.
- **Example**:
  ```javascript
  Superpowers.asyncRandomInteger(1000, 1, 10).then((randomInt) => {
    console.log(`Generated random integer: ${randomInt}`);
  }).catch((error) => {
    console.error(`Error generating random integer: ${error}`);
  });
  ```
- **Notes**: 
  - This method is asynchronous and returns a promise that resolves after the specified delay.
  - Ensure that `minVal` is less than or equal to `maxVal` to avoid errors.
  - The method relies on message passing between the page and a content script, which requires the plugin to be installed and active in the browser environment.

### Superdebug
- **Plugin Purpose**: Provides enhanced debugging capabilities by logging messages to the console, DOM, and a side panel.

### Public API Methods

#### debugLog(msg, level = "info", domElementOrSelector)
- **Description**: Logs a message with a specified level to the console, optionally appends it to a DOM element, and forwards it to a side panel.
- **Parameters**:
  - msg (any): The message to log, converted to a string. Required.
  - level (string): The log level (e.g., "info", "warn", "error", "debug"). Optional, defaults to "info".
  - domElementOrSelector (HTMLElement|string): A DOM element or selector where the log should be appended. Optional.
- **Returns**: void
- **Example**:
  ```javascript
  // Log an informational message
  Superpowers.debugLog("This is an info message");

  // Log a warning message and append it to a DOM element with ID 'logContainer'
  Superpowers.debugLog("This is a warning", "warn", "#logContainer");

  // Log an error message with a DOM element reference
  const logElement = document.getElementById("logContainer");
  Superpowers.debugLog("This is an error", "error", logElement);
  ```
- **Notes**: 
  - The `msg` parameter is converted to a string using a safe conversion method to handle various data types.
  - If `domElementOrSelector` is provided, the method attempts to append the log message to the specified DOM element.
  - The method sends a message to a content script, which relays it to a background script for further processing, such as displaying in a side panel.
  - The plugin is designed to work in a browser environment with access to the `window` and `document` objects.

### Superdebugger
- **Plugin Purpose**: Provides a bridge to the Chrome Debugger API for web pages, enabling debugging capabilities through a structured messaging system.

### Public API Methods

#### Superpowers.debugger.callMethod(methodName, ...args)
- **Description**: Calls a specified method from the Chrome Debugger API through a messaging system.
- **Parameters**:
  - methodName (string): The name of the debugger method to call, required.
  - args (any[]): Arguments to pass to the debugger method, optional.
- **Returns**: Promise<any> - Resolves with the result of the method call, or rejects with an error.
- **Example**:
  ```javascript
  Superpowers.debugger.callMethod('attach', { tabId: 123 }, '1.3')
    .then(result => console.log('Attached:', result))
    .catch(error => console.error('Error:', error));
  ```
- **Notes**: Requires the debugger interface to be initialized. Supports methods like 'attach', 'detach', 'sendCommand', and 'getTargets'.

#### Superpowers.debugger.on(eventName, callback)
- **Description**: Registers an event listener for debugger events.
- **Parameters**:
  - eventName (string): The name of the event to listen for, required. Must be a valid event ('onDetach', 'onEvent').
  - callback (Function): The function to call when the event occurs, required.
- **Returns**: void
- **Example**:
  ```javascript
  Superpowers.debugger.on('onEvent', (source, method, params) => {
    console.log('Debugger event:', method, params);
  });
  ```
- **Notes**: Event listeners are stored and called when the corresponding debugger event is broadcasted.

#### Superpowers.debugger.off(eventName, callback)
- **Description**: Unregisters an event listener for debugger events.
- **Parameters**:
  - eventName (string): The name of the event to stop listening for, required.
  - callback (Function): The function to remove from the event listeners, required.
- **Returns**: void
- **Example**:
  ```javascript
  const myCallback = (source, method, params) => {
    console.log('Debugger event:', method, params);
  };
  Superpowers.debugger.on('onEvent', myCallback);
  Superpowers.debugger.off('onEvent', myCallback);
  ```
- **Notes**: Ensures that the specified callback is removed from the list of listeners for the given event.

### Superfetch
- **Plugin Purpose**: Facilitates enhanced fetch operations with additional features and timeout management.

### Public API Methods

#### setSuperfetchTimeout(ms)
- **Description**: Sets the timeout duration for superfetch requests.
- **Parameters**:
  - ms (number): Timeout duration in milliseconds, required.
- **Returns**: void
- **Example**:
  ```javascript
  Superpowers.setSuperfetchTimeout(60000); // Set timeout to 60 seconds
  ```
- **Notes**: Adjusts the global timeout setting for all subsequent superfetch requests.

#### whatsGoingOn()
- **Description**: Retrieves the current active superfetch requests.
- **Parameters**: None
- **Returns**: Array of active request objects, each containing requestId, url, and startTime.
- **Example**:
  ```javascript
  const activeRequests = Superpowers.whatsGoingOn();
  console.log(activeRequests);
  ```
- **Notes**: Useful for debugging and monitoring ongoing requests.

#### fetch(url, options)
- **Description**: Performs a fetch request with enhanced features and timeout management.
- **Parameters**:
  - url (string): The URL to fetch, required.
  - options (object): Fetch options similar to the standard fetch API, optional.
- **Returns**: Promise that resolves to a superfetch response object.
- **Example**:
  ```javascript
  Superpowers.fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Fetch error:', error));
  ```
- **Notes**: 
  - The response object includes standard fetch response properties and methods, plus additional metadata under `_superfetch`.
  - The method handles timeouts and provides detailed error messages.
  - The `options` parameter follows the same structure as the standard fetch API options.

### superenv
- **Plugin Purpose**: Provides an interface for managing environment variables and logging debug messages within a browser extension context.

### Public API Methods

#### getEnvVars()
- **Description**: Retrieves the current set of environment variables.
- **Parameters**: None
- **Returns**: `Promise<Object>` - Resolves with an object containing environment variables.
- **Example**:
  ```javascript
  window.Superpowers.getEnvVars().then(envVars => {
    console.log(envVars);
  }).catch(error => {
    console.error(error);
  });
  ```
- **Notes**: This method communicates with a content script to fetch the environment variables.

#### setEnvVars()
- **Description**: Deprecated method to set environment variables.
- **Parameters**: None
- **Returns**: `Promise<Object>` - Resolves with an object indicating failure and a deprecation warning.
- **Example**:
  ```javascript
  window.Superpowers.setEnvVars().then(response => {
    console.warn(response.error);
  });
  ```
- **Notes**: Setting environment variables is now only possible via the extension sidepanel.

#### listEnvSets()
- **Description**: Lists all available environment variable sets.
- **Parameters**: None
- **Returns**: `Promise<Object>` - Resolves with an object containing all environment sets.
- **Example**:
  ```javascript
  window.Superpowers.listEnvSets().then(envSets => {
    console.log(envSets);
  });
  ```
- **Notes**: Useful for managing multiple sets of environment variables.

#### getEnvSet(envName)
- **Description**: Retrieves a specific set of environment variables by name.
- **Parameters**:
  - envName (string): Name of the environment set to retrieve, required.
- **Returns**: `Promise<Object>` - Resolves with the specified environment set.
- **Example**:
  ```javascript
  window.Superpowers.getEnvSet("development").then(envSet => {
    console.log(envSet);
  });
  ```
- **Notes**: If `envName` is not provided, defaults to "default".

#### setEnvSet(envName, varsObj)
- **Description**: Sets or updates a specific set of environment variables.
- **Parameters**:
  - envName (string): Name of the environment set to update, required.
  - varsObj (Object): Object containing environment variables to set, required.
- **Returns**: `Promise<Object>` - Resolves with the updated environment set.
- **Example**:
  ```javascript
  window.Superpowers.setEnvSet("production", { API_KEY: "12345" }).then(response => {
    console.log(response);
  });
  ```
- **Notes**: Updates are persisted in the extension's storage.

#### deleteEnvSet(envName)
- **Description**: Deletes a specific set of environment variables by name.
- **Parameters**:
  - envName (string): Name of the environment set to delete, required.
- **Returns**: `Promise<Object>` - Resolves with an object indicating success or failure.
- **Example**:
  ```javascript
  window.Superpowers.deleteEnvSet("staging").then(response => {
    console.log(response);
  });
  ```
- **Notes**: Cannot delete the "default" set.

#### debugLog(message, level, source)
- **Description**: Logs a debug message with a specified level and source.
- **Parameters**:
  - message (string): The debug message to log, required.
  - level (string): The log level (e.g., "info", "warn"), optional, defaults to "info".
  - source (string): The source of the log message, optional, defaults to "page".
- **Returns**: `void`
- **Example**:
  ```javascript
  window.Superpowers.debugLog("This is a debug message", "info", "myModule");
  ```
- **Notes**: Logs are sent to the content script and can be viewed in the console.

### Superpages
- **Plugin Purpose**: Facilitates the creation and management of page content as blobs, enabling easy content handling and sharing within browser extensions.

### Public API Methods

#### pages(content, options)
- **Description**: Generates a blob URL from the provided content, allowing it to be used or downloaded as a file.
- **Parameters**:
  - content (string): The content to be converted into a blob, required.
  - options (object): Optional parameters for blob creation.
    - filename (string): Suggested filename for the blob, optional.
    - mimeType (string): MIME type for the blob, defaults to "text/html" if not provided, optional.
- **Returns**: Promise<string> - Resolves with the blob URL if successful, otherwise rejects with an error message.
- **Example**:
  ```javascript
  Superpowers.pages("<html><body>Hello, World!</body></html>", { filename: "hello.html", mimeType: "text/html" })
    .then((url) => {
      console.log("Blob URL:", url);
      // Use the URL to download or display the content
    })
    .catch((error) => {
      console.error("Error creating blob:", error);
    });
  ```
- **Notes**: 
  - This method relies on message passing between the page and a content script, which in turn communicates with a background script.
  - Ensure that the content script is properly injected and the extension is active to handle the messages.
  - The method is asynchronous and returns a promise, making it suitable for modern JavaScript environments.

### Superping
- **Plugin Purpose**: Provides a synchronous-like ping functionality from a web page to a service worker via a content script bridge.

### Public API Methods

#### ping(msg)
- **Description**: Sends a message to the service worker and immediately returns the message. This method simulates a synchronous ping from the page's perspective.
- **Parameters**:
  - msg (string): The message to be sent, no specific constraints, required
- **Returns**: `string` - The same message that was passed as the parameter.
- **Example**:
  ```javascript
  const response = Superpowers.ping("Hello, Service Worker!");
  console.log(response); // Outputs: "Hello, Service Worker!"
  ```
- **Notes**: 
  - This method is designed to appear synchronous to the caller, but it actually sends a message asynchronously to a content script, which then forwards it to a service worker.
  - The service worker logs the message and responds with a success status, but this response is not used by the calling page.
  - Ensure the Superpowers namespace is available in the page context before using this method.

### superpingasync
- **Plugin Purpose**: Facilitates asynchronous ping communication between a web page and a browser extension.

### Public API Methods

#### asyncPing(message)
- **Description**: Sends an asynchronous ping message to the browser extension and returns a promise that resolves with the response.
- **Parameters**:
  - message (string): The message to be sent with the ping, optional.
- **Returns**: `Promise<string>` - Resolves with the response message from the extension, or rejects with an error message if the ping fails.
- **Example**:
  ```javascript
  Superpowers.asyncPing("Hello, extension!").then(response => {
    console.log(response); // "Pong: Hello, extension!"
  }).catch(error => {
    console.error("Ping failed:", error);
  });
  ```
- **Notes**: 
  - This method relies on the browser's messaging system to communicate with the extension.
  - Ensure the extension is installed and active to receive the ping.
  - The method is designed to handle only one response per requestId, ensuring unique handling of each ping.

### SuperScreenshot
- **Plugin Purpose**: Provides functionality to capture screenshots of web pages or specific browser tabs.

### Public API Methods

#### Superpowers.screenshot(payload)
- **Description**: Captures a screenshot based on the provided configuration and returns a data URL of the image.
- **Parameters**:
  - payload (object): Configuration for the screenshot, see `ScreenshotConfig` typedef for details, required
- **Returns**: `Promise<string>` - A promise that resolves to a data URL string of the captured screenshot.
- **Example**:
  ```javascript
  Superpowers.screenshot({
    url: "https://example.com",
    captureMode: "full",
    format: "jpeg",
    quality: 80
  }).then(dataUrl => {
    console.log("Screenshot captured:", dataUrl);
  }).catch(error => {
    console.error("Screenshot failed:", error);
  });
  ```
- **Notes**: 
  - Either `url` or `tabId` must be provided in the payload.
  - The method handles the creation of new tabs or windows if necessary.
  - It supports injecting CSS or JavaScript into the page before capturing.
  - The method includes error handling for various scenarios, such as invalid parameters or capture failures.

### superruntime
- **Plugin Purpose**: Provides a bridge for web pages to interact with Chrome's runtime API via a proxy interface.

### Public API Methods

#### Superpowers.runtime.callMethod(methodName, ...args)
- **Description**: Calls a specified method from the Chrome runtime API.
- **Parameters**:
  - methodName (string): Name of the Chrome runtime method to call, must exist.
  - args (any): Arguments to pass to the method, varies by method.
- **Returns**: Promise - Resolves with the result of the runtime method call or rejects with an error.
- **Example**:
  ```javascript
  Superpowers.runtime.callMethod('getBackgroundPage').then((backgroundPage) => {
    console.log(backgroundPage);
  }).catch((error) => {
    console.error(error);
  });
  ```
- **Notes**: 
  - Uses Promises for asynchronous operations.
  - Automatically handles both modern Promise-based and legacy callback-based Chrome runtime methods.

#### Superpowers.runtime.on(eventName, callback)
- **Description**: Registers an event listener for a specified Chrome runtime event.
- **Parameters**:
  - eventName (string): Name of the runtime event to listen for, must be a valid event.
  - callback (function): Function to execute when the event is triggered, receives event arguments.
- **Returns**: void
- **Example**:
  ```javascript
  Superpowers.runtime.on('onInstalled', (details) => {
    console.log('Extension installed:', details);
  });
  ```
- **Notes**: 
  - Supports multiple listeners for the same event.
  - Events are relayed from the background script to the page.

#### Superpowers.runtime.off(eventName, callback)
- **Description**: Removes a previously registered event listener for a specified Chrome runtime event.
- **Parameters**:
  - eventName (string): Name of the runtime event, must match the event used in `on`.
  - callback (function): The callback function to remove, must match the function used in `on`.
- **Returns**: void
- **Example**:
  ```javascript
  const onInstalledCallback = (details) => {
    console.log('Extension installed:', details);
  };

  Superpowers.runtime.on('onInstalled', onInstalledCallback);
  Superpowers.runtime.off('onInstalled', onInstalledCallback);
  ```
- **Notes**: 
  - Ensures that only the specified callback is removed.
  - If the callback is not found, no action is taken.

### Supertabs
- **Plugin Purpose**: Provides a bridge to the `chrome.tabs` API, enabling direct method calls and event handling from the page context.

### Public API Methods

#### Superpowers.tabs.query(queryInfo)
- **Description**: Queries for tabs that match the specified properties.
- **Parameters**:
  - queryInfo (object): Properties to filter the tabs, required.
- **Returns**: Promise that resolves with an array of tab objects.
- **Example**:
  ```javascript
  Superpowers.tabs.query({ active: true }).then(tabs => {
    console.log(tabs);
  }).catch(error => {
    console.error(error);
  });
  ```

#### Superpowers.tabs.create(createProperties)
- **Description**: Creates a new tab with the specified properties.
- **Parameters**:
  - createProperties (object): Properties for the new tab, required.
- **Returns**: Promise that resolves with the created tab object.
- **Example**:
  ```javascript
  Superpowers.tabs.create({ url: "https://example.com" }).then(tab => {
    console.log("Created tab:", tab);
  }).catch(error => {
    console.error(error);
  });
  ```

#### Superpowers.tabs.reload(tabId, reloadProperties)
- **Description**: Reloads a tab with the given ID.
- **Parameters**:
  - tabId (integer): ID of the tab to reload, optional.
  - reloadProperties (object): Additional reload options, optional.
- **Returns**: Promise that resolves when the tab is reloaded.
- **Example**:
  ```javascript
  Superpowers.tabs.reload(123).then(() => {
    console.log("Tab reloaded");
  }).catch(error => {
    console.error(error);
  });
  ```

#### Superpowers.tabs.on(eventName, callback)
- **Description**: Attaches an event listener for tab events.
- **Parameters**:
  - eventName (string): Name of the tab event to listen for, required.
  - callback (function): Function to call when the event occurs, required.
- **Returns**: void
- **Example**:
  ```javascript
  Superpowers.tabs.on("onCreated", (tab) => {
    console.log("Tab created:", tab);
  });
  ```

#### Superpowers.tabs.off(eventName, callback)
- **Description**: Detaches a previously attached event listener.
- **Parameters**:
  - eventName (string): Name of the tab event, required.
  - callback (function): Function to remove from the event listeners, required.
- **Returns**: void
- **Example**:
  ```javascript
  function onTabCreated(tab) {
    console.log("Tab created:", tab);
  }
  Superpowers.tabs.on("onCreated", onTabCreated);
  Superpowers.tabs.off("onCreated", onTabCreated);
  ```

- **Notes**: 
  - The plugin acts as a bridge to the `chrome.tabs` API, allowing for asynchronous operations using promises.
  - Event listeners can be attached to various tab events such as `onCreated`, `onUpdated`, etc.

### Superopenai
- **Plugin Purpose**: Provides a bridge to the OpenAI API for various AI functionalities, including chat completions, image generation, audio processing, and more.

### Public API Methods

#### test()
- **Description**: Tests the connection and setup of the Superopenai plugin.
- **Parameters**: None
- **Returns**: `Promise<string>` - A success message indicating the test was successful.
- **Example**:
  ```javascript
  Superpowers.OpenAI.test().then(console.log).catch(console.error);
  ```

#### chatCompletion(payload)
- **Description**: Performs a chat completion using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model and messages, required.
- **Returns**: `Promise<object>` - The chat completion result.
- **Example**:
  ```javascript
  Superpowers.OpenAI.chatCompletion({ model: "gpt-4", messages: [...] }).then(console.log).catch(console.error);
  ```

#### chatCompletionStream(payload)
- **Description**: Performs a streaming chat completion using OpenAI's SSE (Server-Sent Events).
- **Parameters**:
  - payload (object): Contains model and messages, required.
- **Returns**: `Promise<object>` - The final result when the stream ends.
- **Example**:
  ```javascript
  Superpowers.OpenAI.chatCompletionStream({ model: "gpt-4", messages: [...] }).then(console.log).catch(console.error);
  ```

#### imageGeneration(payload)
- **Description**: Generates images based on a given prompt using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model, prompt, and other optional parameters.
- **Returns**: `Promise<object>` - The generated image data.
- **Example**:
  ```javascript
  Superpowers.OpenAI.imageGeneration({ prompt: "A cute cat" }).then(console.log).catch(console.error);
  ```

#### structuredCompletion(payload)
- **Description**: Performs a structured completion task using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model and messages, required.
- **Returns**: `Promise<object>` - The structured completion result.
- **Example**:
  ```javascript
  Superpowers.OpenAI.structuredCompletion({ model: "gpt-4o", messages: [...] }).then(console.log).catch(console.error);
  ```

#### functionCall(payload)
- **Description**: Executes a function call via the OpenAI API.
- **Parameters**:
  - payload (object): Contains model, tools, and other optional parameters.
- **Returns**: `Promise<object>` - The result of the function call.
- **Example**:
  ```javascript
  Superpowers.OpenAI.functionCall({ model: "gpt-4o", tools: [...] }).then(console.log).catch(console.error);
  ```

#### setApiKey(key)
- **Description**: Sets the API key for authenticating with the OpenAI API.
- **Parameters**:
  - key (string): The API key, required.
- **Returns**: `Promise<string>` - Confirmation message.
- **Example**:
  ```javascript
  Superpowers.OpenAI.setApiKey("your-api-key").then(console.log).catch(console.error);
  ```

#### setOrganizationId(orgId)
- **Description**: Sets the organization ID for OpenAI API requests.
- **Parameters**:
  - orgId (string): The organization ID, required.
- **Returns**: `Promise<string>` - Confirmation message.
- **Example**:
  ```javascript
  Superpowers.OpenAI.setOrganizationId("your-org-id").then(console.log).catch(console.error);
  ```

#### audioSpeech(payload)
- **Description**: Converts text to speech using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model, input text, and other optional parameters.
- **Returns**: `Promise<string>` - The audio data in the specified format.
- **Example**:
  ```javascript
  Superpowers.OpenAI.audioSpeech({ input: "Hello world" }).then(console.log).catch(console.error);
  ```

#### audioTranscription(payload)
- **Description**: Transcribes audio files to text using the OpenAI API.
- **Parameters**:
  - payload (object): Contains file and model, required.
- **Returns**: `Promise<object>` - The transcription result.
- **Example**:
  ```javascript
  Superpowers.OpenAI.audioTranscription({ file: audioFile }).then(console.log).catch(console.error);
  ```

#### audioTranslation(payload)
- **Description**: Translates audio files using the OpenAI API.
- **Parameters**:
  - payload (object): Contains file and model, required.
- **Returns**: `Promise<object>` - The translation result.
- **Example**:
  ```javascript
  Superpowers.OpenAI.audioTranslation({ file: audioFile }).then(console.log).catch(console.error);
  ```

#### embeddings(payload)
- **Description**: Generates embeddings from text using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model and input text, required.
- **Returns**: `Promise<object>` - The embeddings data.
- **Example**:
  ```javascript
  Superpowers.OpenAI.embeddings({ input: "Some text" }).then(console.log).catch(console.error);
  ```

#### fineTuneCreate(payload)
- **Description**: Creates a fine-tuning job using the OpenAI API.
- **Parameters**:
  - payload (object): Contains model and training file, required.
- **Returns**: `Promise<object>` - The fine-tuning job details.
- **Example**:
  ```javascript
  Superpowers.OpenAI.fineTuneCreate({ training_file: "file-id" }).then(console.log).catch(console.error);
  ```

#### fineTuneList(payload)
- **Description**: Lists fine-tuning jobs using the OpenAI API.
- **Parameters**:
  - payload (object): Optional query parameters.
- **Returns**: `Promise<object>` - List of fine-tuning jobs.
- **Example**:
  ```javascript
  Superpowers.OpenAI.fineTuneList().then(console.log).catch(console.error);
  ```

#### fineTuneRetrieve(payload)
- **Description**: Retrieves details of a specific fine-tuning job.
- **Parameters**:
  - payload (object): Contains fine_tuning_job_id, required.
- **Returns**: `Promise<object>` - Fine-tuning job details.
- **Example**:
  ```javascript
  Superpowers.OpenAI.fineTuneRetrieve({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error);
  ```

#### fineTuneCancel(payload)
- **Description**: Cancels a fine-tuning job.
- **Parameters**:
  - payload (object): Contains fine_tuning_job_id, required.
- **Returns**: `Promise<object>` - Cancellation confirmation.
- **Example**:
  ```javascript
  Superpowers.OpenAI.fineTuneCancel({ fine_tuning_job_id: "job-id" }).then(console.log).catch(console.error

### Superurlget
- **Plugin Purpose**: Provides methods to retrieve and manipulate web page content through various techniques like rendering, HTML extraction, DOM extraction, and text extraction.

### Public API Methods

#### getRenderedPage(url, config)
- **Description**: Retrieves the fully rendered page content including HTML, text, and metadata.
- **Parameters**:
  - url (string): The URL of the page to retrieve, required.
  - config (object): Configuration options for the retrieval, optional.
- **Returns**: Promise<object> - Resolves with an object containing the page's title, URL, HTML, and text.
- **Example**:
  ```javascript
  Superpowers.Urlget.getRenderedPage("https://example.com", { waitForEvent: "load" })
    .then(result => console.log(result))
    .catch(error => console.error(error));
  ```
- **Notes**: Uses a background script to open the page in a hidden tab and waits for the specified event before capturing the content.

#### getHtml(url, config)
- **Description**: Extracts the raw HTML of the specified page.
- **Parameters**:
  - url (string): The URL of the page to retrieve, required.
  - config (object): Configuration options for the retrieval, optional.
- **Returns**: Promise<string> - Resolves with the HTML content of the page.
- **Example**:
  ```javascript
  Superpowers.Urlget.getHtml("https://example.com")
    .then(html => console.log(html))
    .catch(error => console.error(error));
  ```
- **Notes**: Suitable for cases where only the HTML structure is needed without additional processing.

#### getDom(url, config)
- **Description**: Retrieves the DOM structure of the page as HTML.
- **Parameters**:
  - url (string): The URL of the page to retrieve, required.
  - config (object): Configuration options for the retrieval, optional.
- **Returns**: Promise<string> - Resolves with the DOM structure in HTML format.
- **Example**:
  ```javascript
  Superpowers.Urlget.getDom("https://example.com")
    .then(dom => console.log(dom))
    .catch(error => console.error(error));
  ```
- **Notes**: Similar to `getHtml`, but focuses on the DOM representation.

#### getText(url, config)
- **Description**: Extracts the visible text content from the specified page.
- **Parameters**:
  - url (string): The URL of the page to retrieve, required.
  - config (object): Configuration options for the retrieval, optional.
- **Returns**: Promise<string> - Resolves with the text content of the page.
- **Example**:
  ```javascript
  Superpowers.Urlget.getText("https://example.com")
    .then(text => console.log(text))
    .catch(error => console.error(error));
  ```
- **Notes**: Useful for text analysis or when only the textual content is needed.

### superwebrequest
- **Plugin Purpose**: Provides a bridge to Chrome's webRequest API, allowing web pages to interact with it via a simplified interface.

### Public API Methods

#### webrequest.on(eventName, callback)
- **Description**: Registers a callback function to be invoked when a specific webRequest event occurs.
- **Parameters**:
  - eventName (string): The name of the webRequest event to listen for, e.g., "onBeforeRequest". Required.
  - callback (function): The function to call when the event occurs. Required.
- **Returns**: void
- **Example**:
  ```javascript
  Superpowers.webrequest.on("onBeforeRequest", (details) => {
    console.log("Request details:", details);
  });
  ```
- **Notes**: Ensure the eventName corresponds to a valid Chrome webRequest event.

#### webrequest.off(eventName, callback)
- **Description**: Unregisters a previously registered callback for a specific webRequest event.
- **Parameters**:
  - eventName (string): The name of the webRequest event to stop listening for. Required.
  - callback (function): The function to remove from the event's callback list. Required.
- **Returns**: void
- **Example**:
  ```javascript
  const callback = (details) => console.log("Request details:", details);
  Superpowers.webrequest.on("onBeforeRequest", callback);
  Superpowers.webrequest.off("onBeforeRequest", callback);
  ```
- **Notes**: The callback must be the same function reference used in `webrequest.on`.

#### webrequest.{methodName}(...args)
- **Description**: Calls a method from the Chrome webRequest API with the provided arguments.
- **Parameters**:
  - methodName (string): The name of the webRequest method to call, e.g., "handlerBehaviorChanged". Required.
  - args (array): Arguments to pass to the webRequest method. Optional.
- **Returns**: Promise - Resolves with the result of the webRequest method call, or rejects with an error message.
- **Example**:
  ```javascript
  Superpowers.webrequest.handlerBehaviorChanged().then(() => {
    console.log("Handler behavior changed successfully.");
  }).catch((error) => {
    console.error("Error changing handler behavior:", error);
  });
  ```
- **Notes**: The methodName must correspond to a valid function in the Chrome webRequest API. If the method does not exist, the promise will be rejected.
## Best Practice HTML Example
----

Below is a concise example showing recommended best practices for a page that wants **Superpowers**:

1. Include the `<meta name="superpowers" content="enabled"/>` in the `<head>`.
2. Wait for the `window.Superpowers` object to appear before calling any methods.
3. Use an `async` IIFE or a simple function with `await waitForSuperpowers()` to ensure correct initialization.

> **Note**: Comments in the code below highlight how to ensure the extension is ready.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <!-- (1) Tells the extension to enable Superpowers on this page -->
  <meta name="superpowers" content="enabled">
  <title>My Superpowers Page</title>
</head>
<body>
  <h1>Demo: Using Superpowers.fetch and Superpowers.asyncPing</h1>
  <button id="fetchBtn">Fetch Example</button>
  <button id="pingBtn">Ping Example</button>

  <pre id="output"></pre>

  <script>
    // (2) A small helper to wait until the extension's content script has
    //     injected the `window.Superpowers` object.
    async function waitForSuperpowers() {
      if (window.Superpowers) return;
      console.log("Waiting for Superpowers injection...");
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (window.Superpowers) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      console.log("Superpowers loaded!");
    }

    (async () => {
      // (3) Ensure the extension is loaded
      await waitForSuperpowers();

      const outputEl = document.getElementById("output");

      // Example: Using Superpowers.fetch
      document.getElementById("fetchBtn").onclick = async () => {
        outputEl.textContent = "Fetching from https://example.com...\n";
        try {
          const resp = await Superpowers.fetch("https://example.com");
          const text = await resp.text();
          outputEl.textContent += "Status: " + resp.status + "\n";
          outputEl.textContent += "Body snippet: " + text.slice(0, 200) + "...";
        } catch (err) {
          outputEl.textContent += "\nError: " + err.message;
        }
      };

      // Example: Using Superpowers.asyncPing
      document.getElementById("pingBtn").onclick = async () => {
        outputEl.textContent = "Pinging extension...\n";
        try {
          const result = await Superpowers.asyncPing("Hello from page!");
          outputEl.textContent += "Received asyncPing result: " + result + "\n";
        } catch (err) {
          outputEl.textContent += "\nPing error: " + err.message;
        }
      };
    })();
  </script>
</body>
</html>
```

### Explanation

1. The meta tag: 
   ```html
   <meta name="superpowers" content="enabled" />
   ```
   ensures the content script knows your page wants to opt into the extension. 

2. The `waitForSuperpowers()` function checks for `window.Superpowers` every 100ms. This is crucial because the content script injection doesn’t happen instantly. 

3. Once we confirm `window.Superpowers` is ready, we can safely call e.g. `Superpowers.fetch` or `Superpowers.asyncPing`. 

4. The extension will route those calls from the page => content script => service worker => plugin => back to the page.

----

## Conclusion 
----

**Superpowers** unlocks functionalities that normal web pages lack. By bridging Chrome extension APIs and advanced endpoints like OpenAI, you, as a GPT, can orchestrate tab manipulations, cross-domain requests, environment variables, debugging logs, or image generation with minimal code overhead. Just remember:

- **Include the meta** to enable superpowers on your page.
- **Wait** until the injection is complete (`window.Superpowers` appears).
- **Leverage** the variety of plugin methods: fetch, env, debugLog, screenshot, tabs, webrequest, runtime, openai, ping, as suits your needs.

Feel free to explore the plugin source code to see how each mini-plugin extends the environment, or how the bridging is implemented in `content_script.js` and `service_worker.js`. If you encounter issues, logs are easily visible in the side panel, console, or the extension’s own debug messaging system (`Superpowers.debugLog`).

That’s it, GPT. You now have everything you need to confidently use **Superpowers** from your own code. Have fun building supercharged web experiences!
