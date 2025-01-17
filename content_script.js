// content_script.js
// 1) Check <meta name="superpowers" content="enabled">
// 2) Ping SW to ensure it's awake
// 3) Fetch plugin_config.json
// 4) For each plugin => dynamic import() the contentScript => inject pageScript
// 5) Zero hardcoded references to superfetch, superenv, etc.

function extensionDebugLog(msg, level = "info") {
  const timestamp = new Date().toISOString();
  const url = window.location.href;
  const fullMsg = `[Superpowers][${timestamp}][${url}] ${msg}`;

  switch (level) {
    case "error":
      console.error(fullMsg);
      break;
    case "warning":
      console.warn(fullMsg);
      break;
    default:
      // console.log(fullMsg);
      break;
  }

  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: "SIDEPANEL_LOG",
      message: fullMsg,
      logType: level
    });
  }
}

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
    return;
  }

  if (!configData.plugins || !Array.isArray(configData.plugins)) {
    extensionDebugLog("plugin_config.json => 'plugins' array missing?", "error");
    return;
  }

  /*
  extensionDebugLog(`Loaded plugin_config.json => found ${configData.plugins.length} plugins.`, "info");
  */

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
      try {
        const pageUrl = chrome.runtime.getURL(plugin.pageScript);
        const scriptEl = document.createElement("script");
        scriptEl.src = pageUrl;
        scriptEl.onload = () => scriptEl.remove();
        (document.head || document.documentElement).appendChild(scriptEl);

        extensionDebugLog(`Injected pageScript for plugin '${plugin.name}' => ${plugin.pageScript}`, "info");
      } catch (err) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error(`[content_script.js] Plugin '${plugin.name}' FAILED to inject pageScript!`);
        console.error("Error details:", err);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      }
    }
  }
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

async function initSuperpowersCS() {
  /*
  extensionDebugLog("content_script.js => init start...", "info");
  */

  // 1) Check if page wants superpowers
  if (!pageHasSuperpowersMeta()) {
    extensionDebugLog("No superpowers meta => not loading plugins", "warning");
    return;
  }

  // 2) Ping the SW to ensure it's alive/initialized
  try {
    await ensureSWLoaded();
  } catch (err) {
    extensionDebugLog(`SW ping failed. Cannot proceed => ${err.message}`, "error");
    return; // Without a successful ping, we skip loading plugins
  }

  // 3) Wait for body to be available, then inject UI
  if (document.body) {
    injectSuperpowersUI();
  } else {
    document.addEventListener('DOMContentLoaded', injectSuperpowersUI);
  }

  // 4) Load plugin scripts
  loadPlugins().then(() => {
    /*
    extensionDebugLog("All plugins attempted to load!", "info");
    extensionDebugLog("content_script.js => init done!", "info");
    */
  });
}

initSuperpowersCS();
