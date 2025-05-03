# Superpowers Chrome Extension

**Superpowers** is a powerful Chrome Extension that grants your local HTML pages (or any website where you insert a special meta tag) the ability to:

- **Fetch cross-domain data** (no more same-origin headaches on `file://` or local dev)
- **Use environment variables** (API keys, config secrets) directly in the browser
- **Perform AI/GPT-based operations** (ChatGPT-4.0, image generation, embeddings, etc.) from regular web pages
- **Authenticate with Google** (Search Console, Analytics, Drive, Sheets, etc.) using a stored OAuth token
- **Capture screenshots** or extract fully-rendered HTML from remote pages 
- ...and more!

This repo hosts all the extension's source files, including the background `service_worker.js`, UI pages in `pages/`, and shared styles in `styles/`.

---

## Installation (Chrome Dev Mode)

### Quick Install
1. **Download the Extension**:
   - Visit [github.com/franzenzenhofer/Superpowers-Extension](https://github.com/franzenzenhofer/Superpowers-Extension)
   - Click the green "Code" button
   - Select "Download ZIP"
   - Extract the ZIP file to a folder on your computer

2. **Install in Chrome**:
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer Mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extracted folder
   - Done! You'll see the Superpowers icon in your Chrome toolbar

### Alternative: Clone via Git
```bash
git clone https://github.com/franzenzenhofer/Superpowers-Extension.git
```
Then follow steps 2-5 from the Quick Install above.

---

## Using Superpowers in your web page

### Required Setup

To use Superpowers, you must include BOTH the meta tag AND the ready script in your HTML:

```html
<meta name="superpowers" content="enabled" />
<script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
```

### Initialization Events

After including the required script, use the `Superpowers.ready()` function to ensure your code runs only when Superpowers is fully initialized:

```javascript
// Register a callback to run when Superpowers is fully initialized
Superpowers.ready(function() {
  console.log("✅ Superpowers extension is ready!");
  
  // Now it's safe to use any Superpowers API
  Superpowers.fetch('https://example.com')
    .then(response => response.json())
    .then(data => console.log("Fetched data:", data));
});
```

To handle cases where initialization fails:

```javascript
// Register a callback to run if initialization fails
Superpowers.readyerror(function(errorDetails) {
  console.error("❌ Superpowers failed to initialize:", errorDetails);
  // errorDetails is an array of objects with name and error properties
});
```

> **Important:** The ready script now provides the `Superpowers.ready()` and `Superpowers.readyerror()` functions. This is the required approach instead of using `setTimeout()` or polling for available APIs.

See [README-READY.md](README-READY.md) for more detailed documentation on the initialization APIs.

---

## Table of Contents
1. [Features](#features)
2. [Installation (Chrome Dev Mode)](#installation-chrome-dev-mode)
3. [Basic Usage](#basic-usage)
4. [Environment Variables](#environment-variables)
5. [Credentials Manager (Google OAuth)](#credentials-manager-google-oauth)
6. [AI / GPT Support](#ai--gpt-support)
7. [Screenshots & HTML Extraction](#screenshots--html-extraction)
8. [Repo Overview](#repo-overview)
9. [Contributing](#contributing)
10. [License](#license)

---

## Features

1. **Cross-Domain Fetches**  
   From a local `file://` page, you can do `Superpowers.fetch("https://example.com")` without CORS issues.

2. **Environment Variables**  
   Access secrets like `OPENAI_API_KEY`, `API_TOKEN`, or any custom key from JavaScript via `Superpowers.getEnvVars()`.

3. **AI / GPT Tools**  
   Add your OpenAI key and call `Superpowers.OpenAI.chatCompletion()`, `imageGeneration()`, embeddings, or other GPT endpoints, all client-side.

4. **Google OAuth Credentials**  
   Easily add `client_secret.json` + auto-generate `token.json` for Google Search Console / Analytics calls from a local page.

5. **Screenshot & Rendered HTML**  
   Programmatically capture full-page screenshots and retrieve the final rendered HTML from external URLs.

6. **Side Panel UI**  
   The extension includes a side panel for quick environment variable management, toggling features, and a dedicated credentials manager.

---

## Basic Usage

1. In any local HTML file, add the following meta tag AND ready script in the `<head>`:
   ```html
   <meta name="superpowers" content="enabled" />
   <script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
   ```
   This enables the extension to inject `window.Superpowers` and provides the necessary ready functions.

2. In your page's JavaScript, use the `Superpowers.ready()` function to ensure the extension is fully initialized:

   ```html
   <script>
   // Register a callback to run when Superpowers is fully initialized
   Superpowers.ready(async function() {
     // 1) environment variables
     const env = await Superpowers.getEnvVars();
     console.log("My env variables:", env);

     // 2) cross-domain fetch
     const resp = await Superpowers.fetch("https://example.com/api");
     if (resp.ok) {
       const data = await resp.json();
       console.log("Fetched data:", data);
     }
   });
   
   // Optionally handle initialization errors
   Superpowers.readyerror(function(errorDetails) {
     console.error("Superpowers failed to initialize:", errorDetails);
   });
   </script>
   ```

3. **Open the extension side panel** from the Superpowers icon (or via the extension's "Open Side Panel" command) to manage your environment variables, credentials, or other settings.

---

## Environment Variables

- Click the extension icon or use "Open Side Panel" to open the **Env Manager**.
- Add keys like `OPENAI_API_KEY`, `MY_SECRET_TOKEN`, etc.
- Then call `await Superpowers.getEnvVars()` to fetch them in your page script.

Example:
```js
const vars = await Superpowers.getEnvVars();
console.log(vars.OPENAI_API_KEY); // Your stored key
```

---

## Credentials Manager (Google OAuth)

To use **Google Search Console** or **Analytics** from your local HTML page:

1. **Create a Desktop OAuth Client** in Google Cloud Console and download your `client_secret_xxx.json`.
2. In the extension side panel, click "Credentials Manager" (or open `pages/credentials_manager.html`).
3. Drag-and-drop your `client_secret.json` file; the extension can walk you through generating a `token.json`.
4. Once stored, you can call:
   ```js
   await Superpowers.Gsc.listSites(); 
   // or
   await Superpowers.Ga.listAccounts();
   ```
   directly from your JavaScript.

---

## AI / GPT Support

- **Set an OpenAI API key** in the Env Manager (`OPENAI_API_KEY`).
- Now you can do ChatGPT calls from normal web pages:
  ```js
  const response = await Superpowers.OpenAI.chatCompletion({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello GPT, how are you?" }]
  });
  console.log("GPT chat result:", response);
  ```
- Also supported:
  - `imageGeneration({ prompt, size })`
  - `embeddings()`
  - `audioTranscription()`
  - or any other standard OpenAI API route that's been mapped.

---

## Screenshots & HTML Extraction

Superpowers can open or render a page invisibly, wait for it to load, and return either:

1. A **full-page screenshot**:
   ```js
   const screenshot = await Superpowers.screenshot({
     url: "https://example.com",
     captureMode: "full",
     format: "png"
   });
   // screenshot is a dataURL of the PNG
   ```

2. The **final rendered HTML**:
   ```js
   const rendered = await Superpowers.Urlget.getRenderedPage("https://example.com", {
     waitForEvent: "load",
     timeoutMs: 30000
   });
   console.log("Final HTML length:", rendered.html.length);
   ```

Great for scraping, testing, or any headless-like tasks directly from the browser.

---

## Repo Overview

Here's the key structure:
```
Superpowers-Extension/
├─ pages/
│  ├─ welcome.html          (Main welcome page, shown after install)
│  ├─ first-steps.html      (Detailed setup tutorial)
│  ├─ credentials_manager.html (UI for managing OAuth secrets & tokens)
│  ├─ welcome.js            (JS for welcome page)
│  └─ credentials_manager.js (JS for credentials manager page)
├─ service_worker.js        (Background service worker, handles core logic)
└─ styles/
   └─ superpowers.css       (Global styling for extension UI)
```

You'll find more advanced details in:
- **`pages/first-steps.html`** for a step-by-step usage guide
- **`README-LLM.md`** (if provided) for large language model usage details

---

## Contributing

Contributions are welcome! Feel free to open an issue or PR with improvements, new features, or bug fixes. Make sure your code follows the repository's structure and conventions.

---

## License

This project is under the MIT License. See [LICENSE](LICENSE) for details.

---

### Enjoy your new **Superpowers** in the browser! 
If you have any questions or feature requests, open an issue on GitHub or consult the built-in help in `pages/welcome.html`.