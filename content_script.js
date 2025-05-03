// content_script.js
// 1) Check <meta name="superpowers" content="enabled">
// 2) Ping SW to ensure it's awake
// 3) Inject initializer script with ready/readyerror functions
// 4) Fetch plugin_config.json
// 5) For each plugin => dynamic import() the contentScript => inject pageScript
// 6) Zero hardcoded references to superfetch, superenv, etc.

function extensionDebugLog(msg, level = "info") {
  const timestamp = new Date().toISOString();
  const url = window.location.href;
  const logEntry = {
    timestamp: Date.now(),
    level,
    message: `[Superpowers][${timestamp}][${url}] ${msg}`,
    source: 'content_script'
  };

  // Still send individual logs to sidepanel
  chrome.runtime.sendMessage({
    type: "SIDEPANEL_LOG",
    ...logEntry
  }).catch(() => {}); // Ignore if sidepanel isn't ready
}

// Add a global promise resolver for page script loading
let resolvePageScriptsLoaded;
const pageScriptsLoadedPromise = new Promise(resolve => {
  resolvePageScriptsLoaded = resolve;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOG_BATCH") {
    window.postMessage({
      direction: "from-content-script",
      type: "LOG_BATCH", 
      logs: message.logs
    }, "*");
  }
  
  // Add new case for SUPERPOWERS_STATUS
  if (message.type === "SUPERPOWERS_STATUS") {
    console.debug('[ContentScript] Received SUPERPOWERS_STATUS from SW:', message.payload);
    // Relay to page script
    try {
      window.postMessage({
        direction: 'from-content-script',
        type: 'SUPERPOWERS_STATUS',
        payload: message.payload
      }, '*');
      console.debug('[ContentScript] Successfully forwarded SUPERPOWERS_STATUS to page via postMessage');
    } catch (e) {
      console.error('[ContentScript] Failed to forward SUPERPOWERS_STATUS to page:', e);
    }
    return false; // Don't keep channel open
  }
});

function pageHasSuperpowersMeta() {
  // extensionDebugLog("Checking <meta name='superpowers' content='enabled'>...", "info");
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    const n = metas[i].getAttribute("name")?.toLowerCase();
    const c = metas[i].getAttribute("content")?.toLowerCase();
    if (n === "superpowers" && c === "enabled") {
      // extensionDebugLog("✅ Found superpowers meta tag!", "info");
      return true;
    }
  }
  extensionDebugLog("❌ No superpowers meta found!", "warning");
  return false;
}

/**
 * Ping the service worker to ensure it's awake and plugins are installed.
 */
function ensureSWLoaded() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      if (chrome.runtime.lastError) {
        extensionDebugLog(`SW ping error: ${chrome.runtime.lastError.message}`, "error");
        return reject(chrome.runtime.lastError);
      }
      if (!response || !response.success) {
        extensionDebugLog("SW responded but success=false?", "warning");
        return reject(new Error("SW not ready or no success"));
      }
      /*
      extensionDebugLog("SW ping => success. Plugins presumably loaded.", "info");
      */
      resolve();
    });
  });
}

async function loadPlugins() {
  const configUrl = chrome.runtime.getURL("plugin_config.json");
  let configData;
  try {
    const resp = await fetch(configUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    configData = await resp.json();
  } catch (err) {
    extensionDebugLog(`Error fetching plugin_config.json => ${err}`, "error");
    resolvePageScriptsLoaded(); // Resolve even on error to not block forever
    return;
  }

  if (!configData.plugins || !Array.isArray(configData.plugins)) {
    extensionDebugLog("plugin_config.json => 'plugins' array missing?", "error");
    resolvePageScriptsLoaded(); // Resolve even on error
    return;
  }

  /*
  extensionDebugLog(`Loaded plugin_config.json => found ${configData.plugins.length} plugins.`, "info");
  */
  
  // Track page script injections
  const pageScriptPromises = [];

  for (const plugin of configData.plugins) {
    extensionDebugLog(`Loading plugin '${plugin.name}'`, "info");

    // 1) dynamic import the contentScript in extension context
    if (plugin.contentScript) {
      try {
        const modUrl = chrome.runtime.getURL(plugin.contentScript);
        await import(modUrl);
        extensionDebugLog(`Plugin '${plugin.name}' contentScript imported`, "info");
      } catch (err) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error(`[content_script.js] Plugin '${plugin.name}' FAILED to import contentScript!`);
        console.error("Error details:", err);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      }
    }

    // 2) inject <script> into page for pageScript
    if (plugin.pageScript) {
      // Create a promise for each page script injection attempt
      const injectionPromise = new Promise((resolveInject, rejectInject) => {
        try {
          const pageUrl = chrome.runtime.getURL(plugin.pageScript);
          const scriptEl = document.createElement("script");
          scriptEl.type = "module";
          scriptEl.src = pageUrl;
          scriptEl.onload = () => {
            extensionDebugLog(`Successfully loaded pageScript module for plugin '${plugin.name}'`, "info");
            scriptEl.remove();
            resolveInject(true); // Signal success
          };
          scriptEl.onerror = (err) => {
            console.error(`[content_script.js] Error loading pageScript module for plugin '${plugin.name}':`, err);
            extensionDebugLog(`Error loading pageScript module for plugin '${plugin.name}': ${err}`, "error");
            scriptEl.remove(); // Clean up failed script tag
            resolveInject(false); // Signal failure but don't reject the Promise.all
          };
          (document.head || document.body || document.documentElement).appendChild(scriptEl);
          extensionDebugLog(`Injected pageScript module for plugin '${plugin.name}' => ${plugin.pageScript}`, "info");
        } catch (err) {
          console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
          console.error(`[content_script.js] Plugin '${plugin.name}' FAILED to inject pageScript!`);
          console.error("Error details:", err);
          console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
          resolveInject(false); // Signal failure
        }
      });
      pageScriptPromises.push(injectionPromise);
    }
  }
  
  // Wait for all page scripts injections to be attempted
  await Promise.all(pageScriptPromises);
  extensionDebugLog("All page script injection attempts finished.", "info");
  
  // Signal to initializer.js that page scripts are done
  window.postMessage({
    type: '__SUPERPOWERS_PAGE_SCRIPTS_LOADED__',
    direction: 'internal-cs' // Internal signal from content script
  }, '*');
  resolvePageScriptsLoaded(); // Resolve the global promise
  extensionDebugLog("Sent page script loaded signal to page.", "info");
}

function createSuperpowersBadge() {
  const badge = document.createElement('div');
  badge.id = 'superpowers-badge';
  badge.innerHTML = '🦸 Superpowers';
  badge.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #4a9eff;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: system-ui;
    font-size: 12px;
    z-index: 2147483647;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  return badge;
}

function injectSuperpowersUI() {
  const badge = createSuperpowersBadge();
  document.body.appendChild(badge);
  
  badge.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    } catch (err) {
      console.debug("[Superpowers] Fallback to tab open:", err);
      chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL_TAB" });
    }
  });
}

function injectInitializerScript() {
  // Load the script from the extension's origin, which is allowed by CSP
  const scriptURL = chrome.runtime.getURL('initializer.js');
  
  const script = document.createElement('script');
  script.src = scriptURL;
  script.onload = () => {
    script.remove(); // Clean up after loading
  };
  script.onerror = (err) => {
    console.error("[Superpowers ContentScript] Failed to load initializer script:", err);
  };
  
  (document.head || document.documentElement).appendChild(script);
  console.debug("[Superpowers ContentScript] Injected initializer script from extension origin.");
}

async function initSuperpowersCS() {
  extensionDebugLog("content_script.js => init start...", "info");

  // 1) Check if page wants superpowers
  if (!pageHasSuperpowersMeta()) {
    extensionDebugLog("No superpowers meta => not loading", "warning");
    return;
  }

  // 2) Ping the SW to ensure it's alive/initialized
  let swReady = false;
  try {
    await ensureSWLoaded();
    await chrome.runtime.sendMessage({ type: "CHECK_VERSION_QUIET" });
    swReady = true;
  } catch (err) {
    extensionDebugLog(`SW ping failed. Cannot proceed => ${err.message}`, "error");
    return;
  }
  
  // 3) Inject the initializer script with ready/readyerror functions
  injectInitializerScript();

  // 4) Start loading plugins (which includes page script injection)
  // We don't await loadPlugins here directly, but it sets the signal later
  loadPlugins();

  // 5) Wait for body to be available, then inject UI
  // Use the promise to ensure plugins (and thus UI logic) are attempted before UI inject
  pageScriptsLoadedPromise.then(() => {
    if (document.body) {
      injectSuperpowersUI();
    } else {
      document.addEventListener('DOMContentLoaded', injectSuperpowersUI);
    }
  });
}

initSuperpowersCS();

// Add window message listener to handle page-to-content-script communication
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  
  // Check if the message is to the content script
  const message = event.data;
  if (!message || message.direction !== 'to-content-script') return;
  
  // Handle specific messages
  if (message.type === 'GET_INITIALIZATION_STATUS') {
    // Forward to service worker
    chrome.runtime.sendMessage({ type: 'GET_INITIALIZATION_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ContentScript] Error requesting status:', chrome.runtime.lastError.message);
        
        // Send error response back to page
        window.postMessage({
          direction: 'from-content-script',
          type: 'INITIALIZATION_STATUS_RESPONSE',
          payload: { 
            status: 'error',
            error: chrome.runtime.lastError.message
          }
        }, '*');
        return;
      }
      
      // Forward response to page
      window.postMessage({
        direction: 'from-content-script',
        type: 'INITIALIZATION_STATUS_RESPONSE',
        payload: response
      }, '*');
    });
  }
});
