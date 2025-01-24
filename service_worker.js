// service_worker.js (ES module under MV3)

// 1) Import your plugin manager at the top
import { initializePluginManager } from './plugin_manager.js';

// Add at top of service_worker.js with other state
const SIDEPANEL_STATE = {
  isOpen: false
};

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

function logSW(msg, level = DEBUG.LEVELS.INFO, extra = {}) {
  const timestamp = new Date().toISOString();
  const memory = performance.memory
    ? `[Heap: ${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB]`
    : '';

  const logMsg = `[SW][${timestamp}][${level}]${memory} ${msg}`;
  
  switch (level) {
    case DEBUG.LEVELS.ERROR:
      console.error(logMsg, extra);
      DEBUG.state.errors.push({ timestamp, msg, extra });
      break;
    case DEBUG.LEVELS.WARN:
      console.warn(logMsg, extra);
      break;
    default:
      // Only gather memory usage if debug level is DEBUG
      if (level === DEBUG.LEVELS.DEBUG && performance.memory) {
        console.log(`[SW][Memory] UsedJSHeapSize: ${
          Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
        }MB`);
      }
      break;
  }

  // Keep error history trimmed
  if (DEBUG.state.errors.length > 50) {
    DEBUG.state.errors = DEBUG.state.errors.slice(-50);
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
  logSW(
    `Request ${request.id} ${status} in ${request.duration}ms`,
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
    await chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: "sidepanel.html",
      enabled: true
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "CLOSE_SIDEPANEL") {
    // Close sidepanel for ALL tabs
    await chrome.sidePanel.setOptions({
      enabled: false
    });
    sendResponse({ success: true });
    return true;
  }
});

// Update the message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDEPANEL") {
    if (!SIDEPANEL_STATE.isOpen) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
      SIDEPANEL_STATE.isOpen = true;
    } else {
      chrome.sidePanel.close({ windowId: sender.tab.windowId });
      SIDEPANEL_STATE.isOpen = false;
    }
    sendResponse({ success: true });
    return true;
  }
});

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
    const plugins = await initializePluginManager();

    // Store them in DEBUG state
    DEBUG.state.plugins = plugins;
    DEBUG.state.isInitialized = true;

    // Check if any plugin is inactive => big warning
    const failures = Array.from(plugins.values()).filter(p => !p.active);
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
    logSW(`Active plugins: ${Array.from(plugins.keys()).join(', ')}`, DEBUG.LEVELS.INFO);
  } catch (error) {
    // If we get here, plugin_manager had some unexpected meltdown outside the per-plugin handling
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
  // Listen for action button clicks
  chrome.action.onClicked.addListener((tab) => {
    if (chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      // Fallback for older Chrome versions
      chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
    }
  });

  // Optionally disable auto-open behavior if supported
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ 
      openPanelOnActionClick: true // Enable auto-open on action click
    });
  }
}

// ----------------------------------------------------------------------------
// 5) Immediately call `initialize()` so that the plugin listeners get registered
// ----------------------------------------------------------------------------
(async () => {
  try {
    logSW("Immediate top-level initialization starting...", DEBUG.LEVELS.INFO);
    await initialize();            
    setupSidePanelBehavior();      
  } catch (error) {
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

