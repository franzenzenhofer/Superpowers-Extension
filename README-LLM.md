
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

High-level features:
- **Cross-domain fetch** (`Superpowers.fetch`) that bypasses certain CORS restrictions by handing requests off to the extension.
- **Environment variables** (`Superpowers.getEnvVars`, `Superpowers.setEnvVars`) stored in extension storage, updatable from a side panel UI.
- **Chrome tabs** management (`Superpowers.tabs`) to query, create, remove, move, highlight, pin, or group tabs programmatically.
- **Chrome webRequest** bridging (`Superpowers.webrequest`) to receive or broadcast webRequest events (like `onBeforeRequest`, `onCompleted`, etc.).
- **Async pings** (`Superpowers.asyncPing`) and synchronous pings (`Superpowers.ping`) as example demos of bridging content script => extension => back.
- **Screenshot** capturing (`Superpowers.screenshot`) that can open or reuse a tab, optionally inject CSS or JS, then capture either the visible viewport or the full page.
- **OpenAI** calls (`Superpowers.OpenAI...`) for chat completions, image generation, embeddings, and more advanced endpoints (like fine-tuning or file management).

In essence, **Superpowers** bundles multiple mini-plugins, each exposing a set of new JavaScript functions. If your page includes `<meta name="superpowers" content="enabled">`, the extension’s content script automatically injects code that merges these mini-plugins into a single `window.Superpowers` namespace.

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
----

This section enumerates **all** primary methods that *may* be exposed under `window.Superpowers`. Each plugin might add sub-namespaces. We’ll keep each function explanation short and note the key arguments. Please see the source or advanced docs for deeper details.

### 1) `Superpowers.fetch(url, options)`
- **Purpose**: Performs cross-domain fetch via the extension, bypassing typical CORS issues. Returns a promise that resolves with a custom response object (similar to the standard Fetch API).
- **Arguments**:
  - `url` (string) – The resource URL to fetch.
  - `options` (object) – Optional object with method, headers, body, etc. (mirrors standard `fetch` options).
- **Returns**: A promise with an object that has `.status`, `.statusText`, `.headers`, and methods like `.text()`, `.json()`, etc.

### 2) `Superpowers.getEnvVars()`
- **Purpose**: Retrieve environment variables (stored in the extension’s local storage).
- **Arguments**: *None*.
- **Returns**: A promise that resolves to an object (key-value pairs).

### 3) `Superpowers.setEnvVars(varsObj)`
- **Purpose**: Persist environment variables into extension storage.
- **Arguments**:
  - `varsObj` (object) – Key-value pairs of environment variables to set or overwrite.
- **Returns**: A promise that usually resolves to a success object.

### 4) `Superpowers.debugLog(message, level = "info", domElementOrSelector?)`
- **Purpose**: Send a debug log to the extension’s service worker (which can appear in side panel logs), plus optionally append to a DOM element.
- **Arguments**:
  - `message` (any) – The message or object to log.
  - `level` (string) – e.g., `"info"`, `"warn"`, `"error"`, `"debug"`.
  - `domElementOrSelector` (string|Element) – If provided, also appends the log text to a DOM node on the page.

### 5) `Superpowers.pages(content, options)`
- **Purpose**: Creates a new data URL containing the supplied HTML or text, effectively generating a new “virtual” page. Useful for ephemeral pages or child windows.
- **Arguments**:
  - `content` (string) – The text or HTML string to embed.
  - `options` (object) – May contain `filename`, `mimeType`, etc.
- **Returns**: A promise that resolves to a `blob:` or `chrome-extension:` URL you can open or link to.

### 6) `Superpowers.ping(msg)`
- **Purpose**: A **synchronous** function example. Immediately returns the argument, but also sends a “SUPERPING” message to the extension (fire and forget).
- **Arguments**:
  - `msg` (string) – Any text you want to “ping” with.
- **Returns**: The same `msg` string, synchronously.

### 7) `Superpowers.asyncPing(message)`
- **Purpose**: Asynchronous version of the ping. It actually waits for a response from the extension with “Pong: [message]”.
- **Arguments**:
  - `message` (string) – The text to send to the extension.
- **Returns**: A promise that resolves with a “Pong: yourMessage” string.

### 8) `Superpowers.screenshot(payload)`
- **Purpose**: Captures a screenshot from a newly opened or existing tab. Allows optional width/height, full-page capture, injected CSS/JS, etc.
- **Arguments**:
  - `payload` (object) – e.g., `{ url, tabId, captureMode, format, width, height, injectCss, injectJs, delayMs, keepTabOpen }`.
- **Returns**: A promise that resolves with a data URL of the image (base64-encoded PNG/JPEG).

### 9) `Superpowers.tabs`
- **Purpose**: A nested object (`Superpowers.tabs.[methodName](...)`) bridging the Chrome Tabs API. Also offers events like `onCreated, onUpdated, onRemoved`, etc.
- **Methods**:
  - `on("eventName", callback)` – Listen for events (like `"onCreated"`).
  - `off("eventName", callback)` – Remove a listener.
  - `query(queryInfo)` – Return a promise with matching tab objects.
  - `create(createProperties)` – Create a new tab.
  - `remove(tabIds)` – Close one or multiple tabs.
  - `update(tabId, updateProps)` – e.g., `muted: true` or `pinned: true`.
  - `reload(tabId)` – Reload a tab.
  - `duplicate(tabId)` – Duplicate a tab.
  - `highlight({ tabs, windowId })` – Highlight the given tab(s).
  - `group({ tabIds })` – Group multiple tabs in a tab group. 
  - ...and many more (mirroring `chrome.tabs`).

### 10) `Superpowers.webrequest`
- **Purpose**: A nested object bridging the Chrome `webRequest` APIs, letting you:
  - Listen to events like `onBeforeRequest`, `onCompleted`, `onErrorOccurred`, etc.
  - Call methods like `handlerBehaviorChanged()`.
- **Methods**:
  - `on(eventName, callback)` – E.g. `on('onBeforeRequest', details => {...})`.
  - `off(eventName, callback)` – Remove a listener.
  - `handlerBehaviorChanged()` – Force Chrome to re-check webRequest rules.

### 11) `Superpowers.runtime`
- **Purpose**: Exposes certain `chrome.runtime.*` calls as promise-based or callback-based. Also broadcasts runtime events back to the page. 
- **Examples**:
  - `Superpowers.runtime.on("onInstalled", (details) => {...})`
  - `Superpowers.runtime.getManifest()` or `Superpowers.runtime.sendMessage(...).then(...)`

### 12) `Superpowers.OpenAI`
- **Purpose**: A large set of methods bridging to the OpenAI REST API, including chat, completions, image generation, embeddings, audio, moderation, file management, and fine-tuning. 
- **All Methods**:

  1. **Configuration**  
     - `setApiKey(key)` – Set or update the API key used for OpenAI requests.  
     - `setOrganizationId(orgId)` – Optionally set the organization ID.

  2. **Chat & Completions**  
     - `chatCompletion(payload)` – For GPT chat interactions (e.g. `model: "gpt-4o"`).  
     - `completions(payload)` – Call the older completions endpoint (e.g. `model: "text-davinci-003"`).  
     - `completionsEdit(payload)` – For editing tasks, using the Edit endpoint (e.g. `model: "text-davinci-edit-001"`).  
     - `chatCompletionStream(payload)` – Streamed version of chatCompletion (returns tokens incrementally).  
     - `completionsStream(payload)` – Streamed version of completions (tokens incrementally).

  3. **Images**  
     - `imageGeneration(payload)` – For DALL·E image creation.  
     - `imageEdits(payload)` – Edit an existing image.  
     - `imageVariations(payload)` – Generate variations of an existing image.

  4. **Embeddings**  
     - `embeddings(payload)` – Generate embeddings with, for example, `"text-embedding-ada-002"`.

  5. **Audio**  
     - `audioSpeech(payload)` – Text-to-speech or speech synthesis (if supported).  
     - `audioTranscription(payload)` – Transcription of audio files (e.g., `whisper-1`).  
     - `audioTranslation(payload)` – Translation of audio input.

  6. **Moderation**  
     - `moderationCheck(payload)` – Call OpenAI’s moderation endpoint to check content.

  7. **File Management**  
     - `fileUpload(payload)` – Upload a file for fine-tuning or other usage.  
     - `fileList()` – List all files associated with the account.  
     - `fileDelete(fileId)` – Delete a file by ID.  
     - `fileRetrieve(fileId)` – Retrieve file info by ID.  
     - `fileDownload(fileId)` – Download file content by ID (if supported).

  8. **Fine-tuning**  
     - `fineTuneCreate(payload)` – Create (start) a new fine-tuning job.  
     - `fineTuneList()` – List all fine-tune jobs.  
     - `fineTuneRetrieve(fineTuneId)` – Retrieve the status of a fine-tune job.  
     - `fineTuneCancel(fineTuneId)` – Cancel a running fine-tune job.  
     - `fineTuneListEvents(fineTuneId)` – Retrieve fine-tuning events/logs.  
     - `fineTuneDeleteModel(modelName)` – Delete a fine-tuned model.

  9. **Models**  
     - `listModels()` – List available or permitted models.  
     - `retrieveModel(modelId)` – Retrieve metadata about a specific model.

- **Returns**: Typically a Promise that resolves with the JSON response from the OpenAI API (or streamed tokens if using a streaming method).

### 13) `Superpowers.asyncRandomInteger(timeMs, minVal, maxVal)`
- **Purpose**: Demo plugin that simulates an async random integer generator with optional delay, bridging extension code. 
- **Arguments**:
  - `timeMs` (number) – Milliseconds to wait.
  - `minVal`, `maxVal` (number) – Range for the random integer.
- **Returns**: A promise resolving to a random integer within `[minVal, maxVal]`.

*(Note: Some method signatures or arguments might vary based on updated code, but these represent the key usage patterns.)*

----

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
