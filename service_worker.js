// service_worker.js (ES module under MV3)

// 1) Import your plugin manager at the top
import { initializePluginManager } from './plugin_manager.js';

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
      console.log(logMsg, extra);
  }

  // Keep error history trimmed
  if (DEBUG.state.errors.length > 100) {
    DEBUG.state.errors = DEBUG.state.errors.slice(-100);
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
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .then(() => logSW("SidePanel behavior set", DEBUG.LEVELS.INFO))
      .catch(err => logSW(`SidePanel error: ${err.message}`, DEBUG.LEVELS.ERROR));
  } else {
    logSW("Fallback: Using tab for sidepanel", DEBUG.LEVELS.WARN);
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
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
});

chrome.runtime.onStartup.addListener(() => {
  logSW("Extension startup (browser launched)", DEBUG.LEVELS.INFO);
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
}, 30000);
