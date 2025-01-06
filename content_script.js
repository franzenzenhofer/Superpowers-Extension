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
      console.log(fullMsg);
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
  extensionDebugLog("Checking <meta name='superpowers' content='enabled'>...");
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    const n = metas[i].getAttribute("name")?.toLowerCase();
    const c = metas[i].getAttribute("content")?.toLowerCase();
    if (n === "superpowers" && c === "enabled") {
      extensionDebugLog("✅ Found superpowers meta tag!", "info");
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
      extensionDebugLog("SW ping => success. Plugins presumably loaded.", "info");
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

  extensionDebugLog(`Loaded plugin_config.json => found ${configData.plugins.length} plugins.`, "info");

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
  badge.innerHTML = 'Superpowers';
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

function createSuperpowersOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'superpowers-overlay';
  overlay.style.cssText = `
    position: fixed;
    bottom: 45px;
    right: 10px;
    background: white;
    padding: 15px;
    border-radius: 6px;
    font-family: system-ui;
    font-size: 13px;
    z-index: 2147483646;
    width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: none;
  `;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 14px;">Superpowers Active</h3>
    <p style="margin: 0 0 10px 0;">
      URL: ${window.location.href}<br>
      Frame: ${window.self === window.top ? 'Main Page' : 'Iframe'}
    </p>
    <div id="superpowers-plugins"></div>
  `;
  
  overlay.appendChild(content);
  return overlay;
}

function toggleOverlay() {
  const overlay = document.getElementById('superpowers-overlay');
  if (overlay) {
    const isVisible = overlay.style.display === 'block';
    overlay.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      // Update plugins list when showing
      const pluginsDiv = document.getElementById('superpowers-plugins');
      if (pluginsDiv) {
        chrome.runtime.sendMessage({ type: "GET_ACTIVE_PLUGINS" }, (response) => {
          if (response?.plugins) {
            pluginsDiv.innerHTML = `
              <strong>Active Plugins:</strong><br>
              ${response.plugins.map(p => {
                // Debug: log full object
                console.log('Plugin object:', p);
                
                // Format each plugin info
                return `- ${JSON.stringify(p, null, 2)}`;
              }).join('<br>')}
            `;
          }
        });
      }
    }
  }
}

function injectSuperpowersUI() {
  const badge = createSuperpowersBadge();
  const overlay = createSuperpowersOverlay();
  
  document.body.appendChild(overlay);
  document.body.appendChild(badge);
  
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleOverlay();
  });
  
  document.addEventListener('click', (e) => {
    const ov = document.getElementById('superpowers-overlay');
    const bd = document.getElementById('superpowers-badge');
    if (ov && bd) {
      if (!ov.contains(e.target) && !bd.contains(e.target)) {
        ov.style.display = 'none';
      }
    }
  });
}

async function initSuperpowersCS() {
  extensionDebugLog("content_script.js => init start...", "info");

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
    extensionDebugLog("All plugins attempted to load!", "info");
  });

  extensionDebugLog("content_script.js => init done!", "info");
}

initSuperpowersCS();
