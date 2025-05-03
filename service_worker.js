// Add debug logging for module loading at the very top
console.debug("[SW] Loading service worker modules... [FIXED-VERSION]");

import { initializePluginManager } from './plugin_manager.js';
import { initializeVersionChecker, checkVersionSidepanel } from './modules/version_checker.js';

console.debug("[SW] Modules imported successfully");

// Store the final initialization status
let superpowersInitializationStatus = null;

// Keep original references
const _origRuntimeSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
const _origTabsSendMessage = chrome.tabs.sendMessage.bind(chrome.tabs);

/**
 * Safe wrapper for chrome.runtime.sendMessage
 */
chrome.runtime.sendMessage = function (message, responseCallback) {
  try {
    _origRuntimeSendMessage(message, (res) => {
      // Check for errors
      const err = chrome.runtime.lastError;
      if (err) {
        console.warn("[SafeSend] runtime.sendMessage error:", err.message);
      }
      // invoke original callback if provided
      if (typeof responseCallback === 'function') {
        responseCallback(res);
      }
    });
  } catch (e) {
    console.warn("[SafeSend] runtime.sendMessage threw:", e);
    if (typeof responseCallback === 'function') {
      responseCallback(undefined);
    }
  }
};

/**
 * Safe wrapper for chrome.tabs.sendMessage with connection checking
 * @param {number} tabId - ID of the tab to send message to
 * @param {object} message - Message to send
 * @param {object} [options] - Optional chrome.tabs.sendMessage options
 * @param {function} [responseCallback] - Optional callback for response
 */
chrome.tabs.sendMessage = function (tabId, message, options, responseCallback) {
  // Handle both signatures
  let cb = responseCallback;
  let opts = options;
  if (typeof options === 'function' && !responseCallback) {
    cb = options;
    opts = undefined;
  }

  // First check if tab exists and is ready
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.debug(`[SafeSend] Tab ${tabId} not found, skipping message`);
      if (typeof cb === 'function') cb(undefined);
      return;
    }

    // Skip certain tab states where content scripts can't run
    if (tab.status !== 'complete' || tab.url?.startsWith('chrome://')) {
      console.debug(`[SafeSend] Tab ${tabId} not ready (${tab.status}) or chrome URL, skipping`);
      if (typeof cb === 'function') cb(undefined);
      return;
    }

    // Try sending the message
    try {
      _origTabsSendMessage(tabId, message, opts, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          // Only log real errors, not connection issues
          if (!err.message.includes('Could not establish connection')) {
            console.warn("[SafeSend] tabs.sendMessage error:", err.message, {
              tabId,
              message
            });
          }
        }
        if (typeof cb === 'function') {
          cb(response);
        }
      });
    } catch (e) {
      console.warn("[SafeSend] tabs.sendMessage threw:", e, {
        tabId,
        message
      });
      if (typeof cb === 'function') {
        cb(undefined);
      }
    }
  });
};

// We'll keep DEBUG from your original code
const DEBUG = {
  LEVELS: {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
  },
  
  state: {
    isInitialized: false,
    startupTime: Date.now(),
    messageCount: 0,
    activeRequests: new Set(),
    errors: [],
    plugins: new Map() // Track active plugins with metadata
  }
};

// Consolidate the panel state tracking HERE
const PANEL_STATE = {
  sidePanel: {
    isOpen: false,
    enabled: false
  }
};

const LOG_SERVICE = {
  logs: [],
  maxLogs: 1000,
  listeners: new Set(),
  batchTimeout: null,
  pendingBatch: [],
  
  addLog(level, msg, extra = {}) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message: msg,
      extra,
      source: 'service_worker'
    };
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.pendingBatch.push(logEntry);
    this.scheduleBatch();
  },
  
  scheduleBatch() {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.sendBatch();
      this.batchTimeout = null;
    }, 100); // 100ms batch window
  },
  
  sendBatch() {
    if (!this.pendingBatch.length) return;

    const batch = [...this.pendingBatch]; // Create a copy to avoid issues
    this.pendingBatch = [];

    // FIXED APPROACH: Use a function that handles errors directly
    function sendSafely(tabId, message) {
      try {
        chrome.tabs.sendMessage(tabId, message, function(response) {
          // Handle response inside callback, checking for lastError
          if (chrome.runtime.lastError) {
            // Silently handle expected connection errors
            if (!chrome.runtime.lastError.message?.includes("Could not establish connection")) {
              console.warn(`[FIXED] Error sending to tab ${tabId}:`, chrome.runtime.lastError.message);
            }
          }
        });
      } catch (err) {
        console.warn(`[FIXED] Exception sending to tab ${tabId}:`, err.message);
      }
    }

    // Query tabs safely
    chrome.tabs.query({}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.warn("[FIXED] Error querying tabs:", chrome.runtime.lastError.message);
        return;
      }
      
      // Process each tab
      if (tabs && tabs.length > 0) {
        for (const tab of tabs) {
          if (tab && tab.id) {
            sendSafely(tab.id, {
              type: "LOG_BATCH",
              logs: batch
            });
          }
        }
      }
    });
  }
};

function logSW(msg, level = DEBUG.LEVELS.INFO, extra = {}) {
  LOG_SERVICE.addLog(level, msg, extra);
  
  // Keep console output for development
  switch (level) {
    case DEBUG.LEVELS.ERROR:
      console.error(msg, extra);
      break;
    case DEBUG.LEVELS.WARN:
      console.warn(msg, extra);
      break;
    default:
      console.log(msg, extra);
  }
}

function trackRequest(id, type) {
  const request = {
    id,
    type,
    startTime: Date.now(),
    status: 'pending'
  };
  DEBUG.state.activeRequests.add(request);
  return request;
}

function finishRequest(request, status = 'completed', error = null) {
  request.status = status;
  request.endTime = Date.now();
  request.duration = request.endTime - request.startTime;
  if (error) request.error = error;
  DEBUG.state.activeRequests.delete(request);
  logSW(`Request ${request.id} ${status} in ${request.duration}ms`,  // Fixed string template literal
    error ? DEBUG.LEVELS.ERROR : DEBUG.LEVELS.INFO,
    { request, error }
  );
}

// ----------------------------------------------------------------------------
// 2) Listen for messages (top-level).
// ----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Bump count for debugging
  DEBUG.state.messageCount++;

  const tracked = trackRequest(DEBUG.state.messageCount, request.type);

  logSW(
    `Incoming message #${tracked.id}: ${request.type}`,
    DEBUG.LEVELS.INFO,
    {
      sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
      url: sender.url,
      request
    }
  );

  try {
    switch (request.type) {
      case 'PING':
        sendResponse({ success: true, initialized: DEBUG.state.isInitialized });
        finishRequest(tracked);
        return false; // Not async

      case 'GET_DEBUG_STATE':
        sendResponse({
          success: true,
          state: {
            ...DEBUG.state,
            uptime: Date.now() - DEBUG.state.startupTime,
            activeRequests: Array.from(DEBUG.state.activeRequests)
          }
        });
        finishRequest(tracked);
        return false; // Not async

      case 'GET_COMBINED_ENV':
        // Handler for environment testing
        chrome.storage.local.get("superEnvVars", (result) => {
          const envVars = result.superEnvVars?.default || {};
          sendResponse({ 
            success: true, 
            env: envVars
          });
          finishRequest(tracked);
        });
        return true; // Async response

      case 'GET_PLUGINS_LIST':
        // Handler for plugins list
        const pluginsList = Array.from(DEBUG.state.plugins.values()).map(plugin => ({
          name: plugin.name,
          version: plugin.version || 'N/A',
          status: plugin.active ? 'Active' : 'Inactive',
          error: plugin.error
        }));
        sendResponse({
          success: true,
          plugins: pluginsList
        });
        finishRequest(tracked);
        return false; // Not async

      case 'GET_INITIALIZATION_STATUS':
        // Check if initialization has finished
        if (superpowersInitializationStatus !== null) {
          // Need to serialize the Map for sending
          const payloadToSend = {
            ...superpowersInitializationStatus,
            // Convert Map to plain object for messaging
            results: superpowersInitializationStatus.results ? Object.fromEntries(superpowersInitializationStatus.results) : {} 
          };
          
          sendResponse({ 
            success: true, 
            status: "complete",
            payload: payloadToSend
          });
        } else {
          sendResponse({ 
            success: true, 
            status: "pending"
          });
        }
        
        return false; // Not async

      default:
        // Let plugins handle it or do nothing
        finishRequest(tracked);
        return false; 
    }
  } catch (error) {
    finishRequest(tracked, 'failed', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// Example: a separate "GET_ACTIVE_PLUGINS" message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_ACTIVE_PLUGINS") {
    logSW("Getting active plugins list", DEBUG.LEVELS.INFO);

    const activePlugins = Array.from(DEBUG.state.plugins.values())
      .filter(plugin => plugin.active)
      .map(plugin => plugin.name);
    
    logSW(`Found ${activePlugins.length} active plugins`, DEBUG.LEVELS.INFO);
    
    sendResponse({
      success: true,
      plugins: activePlugins,
      totalCount: DEBUG.state.plugins.size,
      activeCount: activePlugins.length
    });
    
    return false; // Not async
  }
});

// Add to your message listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDEPANEL") {
    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === "CLOSE_SIDEPANEL") {
    if (chrome.sidePanel?.close) {
      chrome.sidePanel.close({ windowId: sender.tab.windowId });
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "OPEN_SIDEPANEL_TAB") {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL("sidepanel.html"),
      active: true
    });
    sendResponse({ success: true });
    return true;
  }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDEPANEL") {
    // Open sidepanel on the current tab
    chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: "sidepanel.html",
      enabled: true
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "CLOSE_SIDEPANEL") {
    // Close sidepanel for ALL tabs
    chrome.sidePanel.setOptions({
      enabled: false
    });
    sendResponse({ success: true });
    return true;
  }
});

// Update the message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDEPANEL") {
    if (!PANEL_STATE.sidePanel.enabled) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
      PANEL_STATE.sidePanel.enabled = true;
    } else {
      chrome.sidePanel.close({ windowId: sender.tab.windowId });
      PANEL_STATE.sidePanel.enabled = false;
    }
    sendResponse({ success: true });
    return true;
  }
});

// Keep the listener below this comment block
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXCHANGE_OAUTH_CODE') {
    // Important: Return true to indicate we will send response asynchronously
    (async () => {
      try {
        const tokenData = await exchangeOAuthToken(request.data);
        sendResponse({ success: true, data: tokenData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});


// Replace all competing side panel handlers with this single one
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDEPANEL") {
    try {
      // This listener correctly uses PANEL_STATE.sidePanel.enabled and isOpen
      // It handles the toggle logic by enabling/disabling the panel
      if (!PANEL_STATE.sidePanel.enabled) {
        chrome.sidePanel.setOptions({
          enabled: true
        }).then(() => {
          try {
            // Attempt to open explicitly after enabling
            if (chrome.sidePanel?.open) {
              chrome.sidePanel.open({ windowId: sender.tab.windowId });
            }
            PANEL_STATE.sidePanel.enabled = true;
            PANEL_STATE.sidePanel.isOpen = true; // Assume open if enabled/opened
            sendResponse({ success: true, state: PANEL_STATE.sidePanel });
          } catch (openErr) {
            // Handle user gesture error specifically
            if (openErr.message.includes("user gesture")) {
              console.warn("[SW] sidePanel.open() needs user gesture. Panel enabled, user must click.");
              PANEL_STATE.sidePanel.enabled = true; // Still enabled
              PANEL_STATE.sidePanel.isOpen = false; // But not programmatically opened
              sendResponse({ success: true, state: PANEL_STATE.sidePanel, needsGesture: true });
            } else {
              throw openErr; // Rethrow other errors
            }
          }
        }).catch(err => { // Catch errors from setOptions
            console.error("[SW] Error enabling side panel:", err);
            sendResponse({ success: false, error: err.message });
        });
      } else {
        // Panel is enabled, so disable it
        chrome.sidePanel.setOptions({
          enabled: false
        }).then(() => {
          PANEL_STATE.sidePanel.enabled = false;
          PANEL_STATE.sidePanel.isOpen = false;
          sendResponse({ success: true, state: PANEL_STATE.sidePanel });
        }).catch(err => { // Catch errors from setOptions
            console.error("[SW] Error disabling side panel:", err);
            sendResponse({ success: false, error: err.message });
        });
      }
    } catch (err) {
      // Catch synchronous errors, though less likely here
      console.error("[SW] Side panel toggle error:", err);
      sendResponse({ success: false, error: err.message });
    }
    return true; // Indicate async response
  }

  if (request.type === "OPEN_CREDENTIALS_MANAGER") {
    try {
      // Always enable the panel and set it to credentials manager
      chrome.sidePanel.setOptions({
        enabled: true,
        path: 'pages/credentials_manager.html'
      }).then(() => {
        PANEL_STATE.sidePanel.enabled = true;
        if (chrome.sidePanel?.open) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
        sendResponse({ success: true });
      });
    } catch (err) {
      console.error("[SW] Credentials manager error:", err);
      // Fallback to new tab if side panel fails
      chrome.tabs.create({
        url: chrome.runtime.getURL("pages/credentials_manager.html"),
        active: true
      });
      sendResponse({ success: true, mode: "fallback" });
    }
    return true; // Keep channel open for async
  }
});

// ADD or keep this async listener to open credentials_manager.html
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "OPEN_CREDENTIALS_MANAGER") {

    
    try {

 
  

      // 1) Attempt to open inside the side panel on modern Chrome
      if (chrome.sidePanel?.setOptions) {
        chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          path: "pages/credentials_manager.html",
          enabled: true
        });

              // Make sure the side panel is actually open
              if (chrome.sidePanel?.open) {
                chrome.sidePanel.open({ windowId: sender.tab.windowId });
              }
        
      
                console.log("[SW] Credentials Manager opened in side panel");
        sendResponse({ success: true, mode: "sidePanel" });
      } else {
        // 2) Fallback: open in a new tab
        chrome.tabs.create({
          url: chrome.runtime.getURL("pages/credentials_manager.html"),
          active: true
        });
        console.log("[SW] Side panel not supported; opened credentials in new tab");
        sendResponse({ success: true, mode: "fallbackTab" });
      }
    } catch (err) {
      // 3) If side panel fails, also fallback to a new tab
      console.warn("[SW] sidePanel.setOptions error, fallback to tab:", err);
      chrome.tabs.create({
        url: chrome.runtime.getURL("pages/credentials_manager.html"),
        active: true
      });
      sendResponse({ success: true, mode: "errorFallbackTab" });
    }
    return true; // Keep response channel open for async
  }
});


async function exchangeOAuthToken(data) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(data)
  });

  const result = await resp.json();
  
  if (!resp.ok) {
    throw new Error(result.error_description || result.error || 'Token exchange failed');
  }

  return result;
}


// ----------------------------------------------------------------------------
// 3) Our main initialization function
// ----------------------------------------------------------------------------
async function initialize() {
  if (DEBUG.state.isInitialized) {
    logSW('Already initialized', DEBUG.LEVELS.WARN);
    return;
  }

  const initStart = performance.now();
  logSW('Initializing service worker (ES module)...', DEBUG.LEVELS.INFO);

  try {
    // Load & install plugin extensions
    try {
      superpowersInitializationStatus = await initializePluginManager();
      console.log('[SW Init] Plugin initialization complete. Status:', superpowersInitializationStatus);
      
      // Ensure results is a Map, even if serialized/deserialized or empty
      if (superpowersInitializationStatus.results && !(superpowersInitializationStatus.results instanceof Map)) {
        try {
          superpowersInitializationStatus.results = new Map(Object.entries(superpowersInitializationStatus.results));
        } catch (e) {
          console.warn('[SW Init] Could not reconstruct results map:', e);
          superpowersInitializationStatus.results = new Map(); // Fallback
        }
      } else if (!superpowersInitializationStatus.results) {
        superpowersInitializationStatus.results = new Map();
      }
      
      // Store plugins in DEBUG state
      DEBUG.state.plugins = superpowersInitializationStatus.results;
    } catch (initError) {
      console.error('[SW Init] CRITICAL: initializePluginManager failed!', initError);
      superpowersInitializationStatus = {
        success: false,
        results: new Map([['plugin_manager', { name: 'plugin_manager', active: false, error: initError.message }]])
      };
      
      // Store the error state in DEBUG
      DEBUG.state.plugins = superpowersInitializationStatus.results;
    }
    
    // Broadcast status to all tabs
    console.log('[SW] Broadcasting initialization status to all tabs');
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('[SW] Error querying tabs:', chrome.runtime.lastError.message);
        return;
      }
      
      let broadcastCount = 0;
      tabs.forEach((tab) => {
        if (tab.id >= 0 && !tab.url.startsWith('chrome://')) { // Basic filtering
          // Need to serialize the Map for sending
          const payloadToSend = {
            ...superpowersInitializationStatus,
            // Convert Map to plain object for messaging
            results: superpowersInitializationStatus.results ? Object.fromEntries(superpowersInitializationStatus.results) : {} 
          };
          
          chrome.tabs.sendMessage(tab.id, {
            type: "SUPERPOWERS_STATUS",
            payload: payloadToSend
          }, (response) => {
            // Optional: Handle response or error from sendMessage
            const err = chrome.runtime.lastError;
            if (err) {
              if (!err.message.includes("Receiving end does not exist")) {
                console.warn(`[SW] Error sending status to tab ${tab.id}:`, err.message);
              }
            } else {
              broadcastCount++;
            }
          });
        }
      });
      
      console.log('[SW] Sent status to', broadcastCount, 'of', tabs.length, 'tabs');
    });
    
    DEBUG.state.isInitialized = true;

    // Check if superenv is loaded and active - it's critical for other plugins
    const superenvPlugin = superpowersInitializationStatus.results.get('superenv_extension');
    if (!superenvPlugin || !superenvPlugin.active) {
      console.error("[SW] CRITICAL: superenv plugin is not loaded or not active!");
      logSW('superenv plugin missing or inactive', DEBUG.LEVELS.ERROR, {
        installed: superpowersInitializationStatus.results.has('superenv_extension'),
        active: superenvPlugin?.active || false
      });
    } else {
      console.log("[SW] superenv plugin loaded and active");
    }

    // Check if all OpenAI-dependent plugins have what they need
    const openaiPlugin = superpowersInitializationStatus.results.get('superopenai_extension');
    if (openaiPlugin) {
      console.log("[SW] superopenai plugin is loaded, checking status");
      if (!openaiPlugin.active) {
        console.error("[SW] WARNING: superopenai plugin failed to activate");
        logSW('superopenai plugin inactive', DEBUG.LEVELS.ERROR, {
          error: openaiPlugin.error || "Unknown error"
        });
      }
    }

    // Check if any plugin is inactive => big warning
    const failures = Array.from(superpowersInitializationStatus.results.values()).filter(p => !p.active);
    if (failures.length > 0) {
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error("[SW] WARNING: Some plugins failed to load:");
      for (const fail of failures) {
        console.error(` - ${fail.name} => ${fail.error || "Unknown error"}`);
      }
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }

    const duration = Math.round(performance.now() - initStart);
    logSW(`Initialization complete in ${duration}ms`, DEBUG.LEVELS.INFO);
    logSW(`Active plugins: ${Array.from(superpowersInitializationStatus.results.keys()).join(', ')}`, DEBUG.LEVELS.INFO);
  } catch (error) {
    // If we get here, there was an unexpected error outside the per-plugin handling
    logSW('Initialization failed', DEBUG.LEVELS.ERROR, {
      error,
      stack: error.stack
    });
    throw error; // In normal usage, we don't expect to reach here anymore
  }
}

// ----------------------------------------------------------------------------
// 4) This sets up your sidepanel logic
// ----------------------------------------------------------------------------
function setupSidePanelBehavior() {
  // Use chrome.sidePanel.setPanelBehavior to enable opening on action click
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true // Ensure this is TRUE
    }).then(() => {
      console.log("[SW] Side panel behavior set to open on action click.");
    }).catch(err => {
      console.warn("[SW] Could not set side panel behavior:", err);
      // Fallback to click listener if setPanelBehavior fails
      setupActionClickListener();
    });
  } else {
    // Fallback for older versions (less reliable than setPanelBehavior)
    console.warn("[SW] chrome.sidePanel.setPanelBehavior not supported. Falling back to onClicked listener.");
    setupActionClickListener();
  }
}

// Separate function for the action click listener to avoid code duplication
function setupActionClickListener() {
  chrome.action.onClicked.addListener((tab) => {
    console.log("[SW] Action icon clicked (fallback).");
    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId: tab.windowId })
        .catch(err => console.error("[SW] Error opening sidepanel:", err));
    } else {
      // If sidePanel API itself isn't available, maybe open as a tab
      console.warn("[SW] chrome.sidePanel.open not available.");
      chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
    }
  });
}

// ----------------------------------------------------------------------------
// 5) Immediately call `initialize()` so that the plugin listeners get registered
// ----------------------------------------------------------------------------
(async () => {
  try {
    logSW("Immediate top-level initialization starting...", DEBUG.LEVELS.INFO);
    console.debug("[SW] Starting initialization sequence");
    
    await initialize();
    console.debug("[SW] Plugin manager initialized");
    
    await initializeVersionChecker();  // Make sure to await this
    console.debug("[SW] Version checker initialized");
    
    setupSidePanelBehavior();
    console.debug("[SW] Sidepanel behavior setup complete");
  } catch (error) {
    console.error("[SW] Initialization error:", error);
    logSW("Immediate initialization error", DEBUG.LEVELS.ERROR, { error });
  }
})();

// ----------------------------------------------------------------------------
// 6) onInstalled/onStartup for logging or additional tasks
// ----------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener((details) => {
  logSW('Extension installed or updated', DEBUG.LEVELS.INFO, {
    reason: details.reason,
    previousVersion: details.previousVersion
  });

  try {
    chrome.contextMenus.create({
      id: "paste-superpowers-instructions",
      title: "Paste Superpowers Instructions",
      contexts: ["editable"]
    });
  } catch (err) {
    console.warn("[service_worker] Could not create context menu:", err);
  }

  if (details.reason === "install" || details.reason === "update") {
    // Only open the welcome page - user can click to open side panel
    chrome.tabs.create({
      url: chrome.runtime.getURL("pages/welcome.html"),
      active: true
    });
  }
});

// ----------------------------------------------------------------------------
// 7) Periodic debug (optional).
// ----------------------------------------------------------------------------
setInterval(() => {
  logSW('Service Worker Status', DEBUG.LEVELS.DEBUG, {
    uptime: Math.round((Date.now() - DEBUG.state.startupTime) / 1000) + 's',
    messageCount: DEBUG.state.messageCount,
    activeRequests: DEBUG.state.activeRequests.size,
    errorCount: DEBUG.state.errors.length,
    memory: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
    } : 'N/A'
  });
}, 60000);


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "paste-superpowers-instructions") {
    try {
      // Load the README-LLM.md content from extension
      const readmeUrl = chrome.runtime.getURL("README-LLM.md");
      const resp = await fetch(readmeUrl);
      const text = await resp.text();

      // Insert the readme text at the caret in the current editable
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          const active = document.activeElement;
          if (active && active.isContentEditable) {
            document.execCommand("insertText", false, content);
          } else if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
            const start = active.selectionStart;
            const end = active.selectionEnd;
            const original = active.value;
            active.value = original.slice(0, start) + content + original.slice(end);
            // Move caret after inserted text
            const newPos = start + content.length;
            active.selectionStart = newPos;
            active.selectionEnd = newPos;
          } else {
            alert("Please click into a text box or editable area before using 'Paste Superpowers Instructions'.");
          }
        },
        args: [text]
      });
    } catch (err) {
      console.error("Failed to paste instructions:", err);
    }
  }
});

