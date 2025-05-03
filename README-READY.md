# README-READY.md

## Reliable Initialization with `Superpowers.ready()` and `Superpowers.readyerror()`

This document explains how to reliably detect when the Superpowers extension is fully initialized and ready for use in your web pages, using the `Superpowers.ready()` and `Superpowers.readyerror()` methods. It also covers how to migrate from older, less reliable techniques like `setTimeout`.

## IMPORTANT UPDATE: Required Ready Script

As of the latest version, you must include **both** of these in your HTML:

```html
<meta name="superpowers" content="enabled" />
<script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
```

The ready script is now required for the extension to work properly.

### The Problem: Race Conditions and Unreliable Initialization Checks

Superpowers injects its core functionality (`window.Superpowers`) and various plugin modules (`Superpowers.fetch`, `Superpowers.OpenAI`, etc.) into your page. However, this injection happens asynchronously. Furthermore, the background Service Worker needs time to initialize itself and load all the necessary background plugin logic (the `extension.js` files managed by `plugin_manager.js`).

Previously, developers might have used `setTimeout` to wait for `window.Superpowers` or specific plugin objects to become available:

```javascript
// 👎 OLD / UNRELIABLE WAY - DO NOT USE!
function checkSuperpowers() {
  if (window.Superpowers && window.Superpowers.fetch) {
    console.log("Superpowers might be ready... let's try using it.");
    initializeApp();
  } else {
    console.log("Superpowers not ready yet, checking again...");
    setTimeout(checkSuperpowers, 300); // Guessing a delay
  }
}
setTimeout(checkSuperpowers, 300); // Initial guess

function initializeApp() {
  // Problem: Even if Superpowers.fetch exists on the page,
  // the background service worker might not be fully ready to handle the fetch call yet!
  Superpowers.fetch('https://example.com')
    .then(/* ... */)
    .catch(err => console.error("Fetch failed, maybe SW wasn't ready?", err));
}
```

This approach has several drawbacks:

1.  **Race Conditions:** `window.Superpowers.fetch` might exist on the page, but the corresponding Service Worker logic might not be fully loaded and listening for messages yet. Calling it too early can lead to errors or lost messages.
2.  **Guesswork:** Using `setTimeout` relies on guessing an appropriate delay, which can vary significantly based on system load, extension startup time, etc. It's inefficient and unreliable.
3.  **No Failure Detection:** This method provides no way to know if the extension's background initialization failed entirely or if specific plugins failed to load.

### The Solution: `Superpowers.ready()` and `Superpowers.readyerror()`

To solve these issues, Superpowers now provides two dedicated methods to reliably signal the completion state of its **background Service Worker initialization**:

1.  **`Superpowers.ready(callback)`:** For handling successful initialization.
2.  **`Superpowers.readyerror(callback)`:** For handling initialization failures or timeouts.

These methods guarantee that your callback will fire exactly once, at the appropriate time, regardless of whether you register the callback before or after the initialization completes.

### Using `Superpowers.ready(callback)`

Use this method to execute code only when the Superpowers Service Worker confirms that *it* and *all* its registered background plugins (e.g., `superfetch`, `superenv`, `superopenai` extensions in the SW) have initialized successfully.

```javascript
/**
 * Registers a callback to run when Superpowers background is fully initialized.
 * The callback receives no arguments.
 * It fires exactly once upon successful initialization.
 *
 * @param {function} callback - The function to execute when ready.
 */
Superpowers.ready(function() {
  console.log("✅ Superpowers Service Worker and all background plugins are ready!");

  // It's now safe to reliably use Superpowers APIs
  Superpowers.getEnvVars()
    .then(vars => {
      console.log("Environment variables:", vars);
      if (vars.OPENAI_API_KEY) {
        return Superpowers.OpenAI.chatCompletion({ /* ... */ });
      }
    })
    .catch(err => {
      console.error("Error using Superpowers after ready:", err);
    });
});

// You can register multiple callbacks
Superpowers.ready(function() {
  console.log("Another ready callback firing!");
});
```

**Key Points:**

*   The `ready` callback fires only if the Service Worker initialization *succeeds*.
*   It fires *after* `plugin_manager.js` has attempted to load all plugins defined in `plugin_config.json`.
*   If you call `Superpowers.ready()` *after* the extension has already initialized successfully, the callback will still execute immediately (asynchronously, via `setTimeout(..., 0)`).

### Using `Superpowers.readyerror(callback)`

Use this method to handle cases where the Superpowers Service Worker fails to initialize correctly, a background plugin fails to load, or the page doesn't receive the ready status from the Service Worker within a reasonable time limit (~15 seconds).

```javascript
/**
 * Registers a callback to run if Superpowers background initialization fails.
 * The callback receives one argument: errorDetails.
 * It fires exactly once upon initialization failure or timeout.
 *
 * @param {function} callback - The function to execute on error.
 * @param {Array<{name: string, error: string | null}>} callback.errorDetails - An array containing details about failed plugins or a timeout error.
 */
Superpowers.readyerror(function(errorDetails) {
  console.error("❌ Superpowers background initialization failed!");

  if (errorDetails && errorDetails.length > 0) {
    if (errorDetails[0].name === 'Initialization Timeout') {
      console.error("Timeout:", errorDetails[0].error);
      // Handle timeout - maybe show a message to the user to reload?
      alert("Superpowers extension took too long to respond. Please try reloading the page or checking the extension status.");
    } else {
      console.error("Failed Plugins/Components:");
      errorDetails.forEach(detail => {
        console.error(`- ${detail.name}: ${detail.error || 'Unknown Error'}`);
      });
      // Handle specific plugin failures - maybe disable features relying on them?
      alert("Some Superpowers components failed to load. Certain features may be unavailable. Check the developer console for details.");
    }
  } else {
    console.error("An unknown initialization error occurred.");
  }
});
```

**Key Points:**

*   The `readyerror` callback fires only if the Service Worker initialization *fails* or *times out*.
*   The `errorDetails` argument provides insight into what went wrong:
    *   It's an array of objects, each with `name` (plugin/component name) and `error` (error message).
    *   If the failure was due to a timeout waiting for the Service Worker status, the array will contain a single entry like: `[{ name: 'Initialization Timeout', error: 'Superpowers did not report status within the time limit.' }]`.
*   If you call `Superpowers.readyerror()` *after* the extension has already failed initialization, the callback will execute immediately (asynchronously) with the error details.

### What "Ready" Means (and Doesn't Mean)

When `Superpowers.ready()` fires, it guarantees:

1.  The Superpowers Service Worker is running.
2.  The `plugin_manager.js` in the Service Worker has finished attempting to load *all* background plugins (`extension.js` files) specified in `plugin_config.json`.
3.  The Service Worker is actively listening for messages from the page for all successfully loaded plugins.
4.  All plugin `page.js` files (like `plugins/superopenai/page.js`) have been injected and loaded by the content script.

This means you can safely access any API exposed by the plugins (like `Superpowers.OpenAI`, `Superpowers.fetch`, etc.) as soon as the `ready()` callback executes, without worrying about race conditions or undefined objects.

It **does not** guarantee:

1.  That external services (like the OpenAI API or Google APIs) are reachable or configured correctly. `ready()` only signals the extension's internal readiness.
2.  That plugin API calls will succeed - they may still fail due to network issues, authentication problems, etc. The guarantee is only that the API objects themselves are available for calling.

The synchronization mechanism ensures that both the background service worker initialization AND all page-level script injections are complete before firing the `ready()` callback, eliminating race conditions that previously required guesswork with timeouts.

### Migration Guide: From `setTimeout` to `ready`/`readyerror`

Migrating is straightforward. Replace your polling/timeout logic with `Superpowers.ready()` and optionally `Superpowers.readyerror()`.

**Before (Unreliable):**

```javascript
function tryInitApp() {
  if (window.Superpowers && window.Superpowers.getEnvVars) {
    console.log("Attempting to use Superpowers...");
    window.Superpowers.getEnvVars()
      .then(vars => {
        console.log("Got Env Vars (maybe):", vars);
        // ... proceed with app logic ...
      })
      .catch(err => {
        console.error("Superpowers call failed, maybe not ready?", err);
        // Maybe retry? Unreliable.
      });
  } else {
    console.log("Waiting for Superpowers...");
    setTimeout(tryInitApp, 500); // Keep trying
  }
}
setTimeout(tryInitApp, 500); // Initial delay
```

**After (Reliable):**

```javascript
// --- Handle Success ---
Superpowers.ready(function() {
  console.log("Superpowers background is ready! Initializing app...");
  // Now reliably call Superpowers methods
  window.Superpowers.getEnvVars()
    .then(vars => {
      console.log("Successfully got Env Vars:", vars);
      // ... proceed with app logic ...
    })
    .catch(err => {
      // Handle errors from the API call itself (e.g., network error)
      console.error("Error during getEnvVars call:", err);
    });

  // Example: Initialize another feature
  if (window.Superpowers.OpenAI) {
     console.log("OpenAI module seems available, can potentially use it.");
  }
});

// --- Handle Failure ---
Superpowers.readyerror(function(errorDetails) {
  console.error("Superpowers background failed to initialize properly.");
  errorDetails.forEach(detail => {
    console.error(`- Failed component: ${detail.name}, Error: ${detail.error || 'Unknown'}`);
  });
  // Optionally, inform the user or disable features
  alert("Superpowers extension failed to load correctly. Some features might be unavailable.");
});

console.log("Registered Superpowers ready/error handlers.");
```

### Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Superpowers Ready Example</title>
  <!-- 1. Enable Superpowers with BOTH meta tag AND ready script -->
  <meta name="superpowers" content="enabled">
  <script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
  <style>
    body { font-family: sans-serif; padding: 1em; }
    #status { padding: 1em; border-radius: 5px; margin-top: 1em; }
    .ready { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .pending { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856408; }
  </style>
</head>
<body>
  <h1>Superpowers Initialization Test</h1>
  <div id="status" class="pending">Status: Pending...</div>
  <div id="env-vars">Environment Vars: (waiting)</div>
  <div id="errors"></div>

  <script>
    const statusDiv = document.getElementById('status');
    const envVarsDiv = document.getElementById('env-vars');
    const errorsDiv = document.getElementById('errors');

    // --- Using the new methods ---

    Superpowers.ready(async () => {
      console.log('EVENT: Superpowers Ready!');
      statusDiv.textContent = 'Status: Superpowers Background Ready!';
      statusDiv.className = 'ready';

      try {
        const vars = await Superpowers.getEnvVars();
        envVarsDiv.textContent = `Environment Vars: ${JSON.stringify(vars, null, 2)}`;

        // You can now safely use other Superpowers features
        // if (Superpowers.fetch) { /* ... */ }

      } catch (err) {
        envVarsDiv.textContent = 'Environment Vars: Error fetching!';
        console.error("Error fetching env vars after ready:", err);
      }
    });

    Superpowers.readyerror((errorDetails) => {
      console.error('EVENT: Superpowers Error!', errorDetails);
      statusDiv.textContent = 'Status: Superpowers Background Initialization Failed!';
      statusDiv.className = 'error';
      envVarsDiv.textContent = 'Environment Vars: (unavailable)';

      errorsDiv.innerHTML = '<h3>Initialization Errors:</h3><ul>';
      errorDetails.forEach(detail => {
        errorsDiv.innerHTML += `<li><strong>${detail.name}:</strong> ${detail.error || 'Unknown Error'}</li>`;
      });
      errorsDiv.innerHTML += '</ul>';
    });

    console.log("Superpowers ready/error listeners registered.");

  </script>
</body>
</html>
```

### Summary

*   **Always use `Superpowers.ready()`** to run code that depends on the extension's background services being fully initialized.
*   **Use `Superpowers.readyerror()`** to gracefully handle initialization failures or timeouts.
*   **Stop using `setTimeout`** for checking Superpowers readiness.
*   This new mechanism provides a reliable, event-driven way to synchronize your page logic with the Superpowers extension's lifecycle. 