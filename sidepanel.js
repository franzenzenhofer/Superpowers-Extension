// sidepanel.js
//
// Minimal logic for reading/writing environment variables in chrome.storage,
// displayed in a side panel, plus a debug message listener, with bug fixes:
//   - Changing a variable’s "Key" now removes the old key from storage
//   - Deleting a row removes it from storage immediately
//   - Clear, straightforward row-based saving
//
// ***KISS / robust approach***
//
////////////////////////////////////////////////
// DOM references
////////////////////////////////////////////////
const envContainerEl = document.getElementById("envContainer");
const debugOutputEl = document.getElementById("debugOutput");
const toastEl = document.getElementById("toast");

// Limit debug logs
const MAX_DEBUG_LINES = 100;

// We'll define some basic config
const VIRTUAL_LIST_CONFIG = {
  rowHeight: 150,
  bufferSize: 5,
  recyclePool: new Map(),
  maxPoolSize: 50
};

// Basic state trackers (optional for future diff calculations)
let previousEnvState = null;
const stateChangeTracker = {
  added: new Set(),
  modified: new Set(),
  removed: new Set()
};

////////////////////////////////////////////////
// Toast utility
////////////////////////////////////////////////
function showToast(message) {
  toastEl.classList.remove("show");
  toastEl.textContent = message;
  // Force a reflow so removing/adding class triggers properly
  void toastEl.offsetWidth;
  toastEl.classList.add("show");

  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

////////////////////////////////////////////////
// Debug logging
////////////////////////////////////////////////
let logBuffer = [];
let renderTimeout = null;

function debugLog(message, data = null, level = "info") {
  const logEntry = {
    timestamp: Date.now(),
    level,
    message: data ? `${message} ${JSON.stringify(data)}` : message,
    source: 'sidepanel'
  };
  handleLogEntry(logEntry);

  // Also log to console
  switch (level) {
    case "error":
      console.error(logEntry.message);
      break;
    case "warning":
    case "warn":
      console.warn(logEntry.message);
      break;
    default:
      console.log(logEntry.message);
      break;
  }
}

function handleLogEntry(entry) {
  logBuffer.push(entry);
  scheduleLogRender();
}

function scheduleLogRender() {
  if (renderTimeout) return;
  renderTimeout = requestAnimationFrame(() => {
    renderLogs();
    renderTimeout = null;
  });
}

function renderLogs() {
  if (!logBuffer.length || !debugOutputEl) return;

  const fragment = document.createDocumentFragment();
  logBuffer.forEach(log => {
    const entry = document.createElement('div');
    entry.className = `log-entry ${log.level}`;
    entry.textContent = `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`;
    fragment.appendChild(entry);
  });

  debugOutputEl.insertBefore(fragment, debugOutputEl.firstChild);

  // Keep only up to MAX_DEBUG_LINES
  while (debugOutputEl.children.length > MAX_DEBUG_LINES) {
    debugOutputEl.lastChild.remove();
  }
  logBuffer = [];
  debugOutputEl.scrollTop = 0;
}

////////////////////////////////////////////////
// Safe addEventListener
////////////////////////////////////////////////
function safeAddEventListener(id, eventName, handler) {
  const el = document.getElementById(id);
  if (!el) {
    debugLog(`Element #${id} not found`, null, "warn");
    return;
  }
  el.addEventListener(eventName, handler);
}

////////////////////////////////////////////////
// Chrome runtime message listening
////////////////////////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SIDEPANEL_LOG") {
    debugLog(request.message);
    sendResponse({ success: true });
  }
});

function hasExistingUpdateNotice() {
  return document.querySelector('.update-notice') !== null;
}

// Single update notice handler with timestamp tracking
let lastUpdateTimestamp = 0;
const UPDATE_COOLDOWN = 1000; // 1 second cooldown between notices

function showUpdateNotice(info) {
  // Don't add if we already have an update notice
  if (document.querySelector('.update-notice')) {
    console.debug("[Sidepanel] Update notice already exists, skipping");
    return;
  }

  // Prevent duplicate notices in rapid succession
  if (info.timestamp && info.timestamp - lastUpdateTimestamp < UPDATE_COOLDOWN) {
    console.debug("[Sidepanel] Update notice cooldown active, skipping");
    return;
  }
  lastUpdateTimestamp = info.timestamp || Date.now();

  const updateNotice = document.createElement('div');
  updateNotice.className = 'update-notice';
  updateNotice.innerHTML = `
    <div style="background:#fff3cd;color:#856404;padding:8px;margin:8px;border-radius:4px;border:1px solid #ffeeba;">
      Update Available: v${info.latestVersion}
      <a href="${info.updateUrl}" target="_blank" style="color:#533f03;text-decoration:underline;">Update Now</a>
    </div>
  `;
  document.body.insertBefore(updateNotice, document.body.firstChild);
}

// Single message handler for all update types
chrome.runtime.onMessage.addListener((request) => {
  if ((request.type === "VERSION_CHECK" || request.type === "SIDEPANEL_VERSION_UPDATE") && request.latestVersion) {
    showUpdateNotice(request);
  }
});

////////////////////////////////////////////////
// init
////////////////////////////////////////////////
function init() {
  try {
    debugLog("Sidepanel initializing...");
    chrome.runtime.sendMessage({ type: "CHECK_VERSION_QUIET" });

    loadEnvVars();

    safeAddEventListener("addRowBtn", "click", addRow);
    safeAddEventListener("saveBtn", "click", saveEnvVars);
    safeAddEventListener("refreshEnvBtn", "click", refreshEnvTest);
    safeAddEventListener("clearDebugBtn", "click", clearDebug);

    safeAddEventListener("loadCredsBtn", "click", () => {
      window.location.href = chrome.runtime.getURL('pages/credentials_manager.html');
    });

    envContainerEl.addEventListener('click', handleVariableActions);

    updatePluginsList();

    // Show tooltip on hover
    document.querySelectorAll('.action-button').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        showToast(btn.textContent);
      });
    });

    // Copy instructions button
    const copyBtn = document.getElementById("copyInstructionsBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          const readmeUrl = chrome.runtime.getURL("README-LLM.md");
          const resp = await fetch(readmeUrl);
          const text = await resp.text();
          await navigator.clipboard.writeText(text);
          showToast("Superpowers instructions copied to clipboard!");
          debugLog("Copied Superpowers instructions to clipboard");
        } catch (err) {
          console.error("Error copying instructions:", err);
          showToast("Failed to copy instructions");
        }
      });
    }

  } catch (err) {
    console.error("Initialization error:", err);
    debugLog("Initialization error:", err, "error");
  }
}
document.addEventListener("DOMContentLoaded", init);

////////////////////////////////////////////////
// loadEnvVars
////////////////////////////////////////////////
function loadEnvVars() {
  debugLog("Loading environment variables");
  chrome.storage.local.get(["superEnvVars"], (res) => {
    if (chrome.runtime.lastError) {
      debugLog("Error loading vars:", chrome.runtime.lastError, "error");
      return;
    }
    const vars = res.superEnvVars || {};
    const envVars = (typeof vars === 'object' && !Array.isArray(vars)) ? (vars.default || vars) : {};
    debugLog("Loaded variables:", envVars, "info");
    renderRows(envVars);
  });
}

////////////////////////////////////////////////
// renderRows
////////////////////////////////////////////////
function renderRows(envVars) {
  if (!envContainerEl) {
    debugLog("No envContainer element found!", null, "error");
    return;
  }
  chrome.storage.local.get(["superEnvVars"], (res) => {
    const vars = res.superEnvVars || {};
    const descriptions = vars.descriptions || {};

    envContainerEl.innerHTML = '<div class="rows-list"></div>';
    const container = envContainerEl.querySelector('.rows-list');

    Object.entries(envVars).forEach(([key, value]) => {
      const desc = descriptions[key] || "";
      const row = createRow(key, value, desc);
      container.appendChild(row);
    });
  });
}

////////////////////////////////////////////////
// createRow
////////////////////////////////////////////////
function createRow(keyVal = "", valVal = "", descVal = "") {
  const row = document.createElement("div");
  row.className = "variable-card";

  // Remember the old key to remove from storage if changed
  row.dataset.originalKey = keyVal;

  const anchorId = encodeURIComponent(keyVal);
  row.innerHTML = `
    <a name="${anchorId}" id="${anchorId}"></a>
    <div class="input-group">
      <label>Key</label>
      <input type="text" class="super-input" placeholder="KEY" value="${keyVal}">
    </div>
    <div class="input-group">
      <label>Value</label>
      <input type="password" class="super-input" placeholder="VALUE" value="${valVal}">
    </div>
    <div class="input-group">
      <label>Description</label>
      <input type="text" class="super-input" placeholder="Optional description" value="${descVal}">
    </div>
    <div class="variable-actions">
      <div class="action-row">
        <button class="action-button toggle">👁️ Show</button>
        <button class="action-button delete">❌ Remove</button>
      </div>
      <button class="action-button save">💾 Save</button>
    </div>
  `;
  return row;
}

////////////////////////////////////////////////
// addRow
////////////////////////////////////////////////
function addRow() {
  const newRow = createRow();
  if (envContainerEl.firstChild) {
    envContainerEl.insertBefore(newRow, envContainerEl.firstChild);
  } else {
    envContainerEl.appendChild(newRow);
  }
}

////////////////////////////////////////////////
// saveField (single row)
////////////////////////////////////////////////
async function saveField(button) {
  const card = button.closest('.variable-card');
  if (!card) {
    debugLog('Cannot find variable card', null, "error");
    showToast('Error: No variable card');
    return;
  }
  const originalText = button.textContent;
  button.textContent = '💫 Saving...';
  button.disabled = true;

  const inputs = card.querySelectorAll('input');
  const key = inputs[0]?.value?.trim();
  const value = inputs[1]?.value;
  const desc = inputs[2]?.value?.trim();

  if (!key) {
    showToast('Please enter a key');
    button.textContent = originalText;
    button.disabled = false;
    return;
  }

  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.get(["superEnvVars"], (res) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

        const store = res.superEnvVars || { default: {} };
        if (!store.default) store.default = {};
        if (!store.descriptions) store.descriptions = {};

        const oldKey = card.dataset.originalKey || "";
        // If the user changed the key from oldKey -> new key, remove old from store
        if (oldKey && oldKey !== key) {
          delete store.default[oldKey];
          delete store.descriptions[oldKey];
        }

        // Now set the new key
        store.default[key] = value;
        if (desc) store.descriptions[key] = desc;
        else delete store.descriptions[key];

        // Update the row's known "originalKey"
        card.dataset.originalKey = key;

        chrome.storage.local.set({ superEnvVars: store }, () => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          resolve();
        });
      });
    });

    button.textContent = '✅ Saved!';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1000);
    showToast(`Saved: ${key}`);
    debugLog(`Saved field: ${key} => ${value}`, { desc }, "info");
    // Reload
    loadEnvVars();

  } catch (err) {
    console.error("Error saving field:", err);
    showToast('Error saving field');
    debugLog("Error saving field:", err, "error");
    button.textContent = '❌ Error';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1000);
  }
}

////////////////////////////////////////////////
// saveEnvVars (Save All)
////////////////////////////////////////////////
function saveEnvVars() {
  const rows = envContainerEl.querySelectorAll('.variable-card');
  const newEnv = {};
  const newDescs = {};

  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input');
    const k = inputs[0].value.trim();
    const v = inputs[1].value;
    const d = inputs[2].value.trim();
    if (k) {
      newEnv[k] = v;
      if (d) newDescs[k] = d;
    }
  });

  debugLog("Saving variables (saveAll):", newEnv);
  chrome.storage.local.get(["superEnvVars"], (res) => {
    if (chrome.runtime.lastError) {
      debugLog("Error loading for saveAll:", chrome.runtime.lastError, "error");
      alert("Error loading prior environment!");
      return;
    }

    const store = res.superEnvVars || {};
    if (!store.default) store.default = {};
    if (!store.descriptions) store.descriptions = {};

    // Overwrite default
    store.default = newEnv;

    // Overwrite or remove descriptions
    for (const k of Object.keys(store.descriptions)) {
      if (!newDescs[k]) delete store.descriptions[k];
    }
    for (const k of Object.keys(newDescs)) {
      store.descriptions[k] = newDescs[k];
    }

    chrome.storage.local.set({ superEnvVars: store }, () => {
      if (chrome.runtime.lastError) {
        debugLog("Error saving (saveAll):", chrome.runtime.lastError, "error");
        alert("Error saving variables!");
        return;
      }
      debugLog("Variables saved successfully", null, "info");
      alert("Variables saved!");
      loadEnvVars();
    });
  });
}

////////////////////////////////////////////////
// refreshEnvTest
////////////////////////////////////////////////
function refreshEnvTest() {
  debugLog("Refreshing environment variables test panel...", null, "info");
  chrome.storage.local.get(["superEnvVars"], (res) => {
    if (chrome.runtime.lastError) {
      debugLog("Error loading vars for test:", chrome.runtime.lastError, "error");
      return;
    }
    const testOutput = document.getElementById("envTestOutput");
    if (!testOutput) {
      debugLog("No #envTestOutput found, skipping", null, "warn");
      return;
    }

    const store = res.superEnvVars || {};
    let output = "Current Environment Variables:\n============================\n\n";

    // default
    const def = store.default || {};
    if (Object.keys(def).length === 0) {
      output += "No environment variables set.\n";
    } else {
      for (const [k,v] of Object.entries(def)) {
        output += `${k} = ${v}\n`;
      }
    }

    const otherKeys = Object.keys(store).filter(k => k !== 'default' && k !== 'descriptions');
    if (otherKeys.length) {
      output += "\nNamed Environments:\n===================\n";
      otherKeys.forEach(envName => {
        output += `[${envName}]:\n`;
        for (const [k,v] of Object.entries(store[envName])) {
          output += `  ${k} = ${v}\n`;
        }
        output += "\n";
      });
    }
    output += "\nLast updated: " + new Date().toISOString();
    testOutput.textContent = output;
    debugLog("Test panel refreshed");
  });
}

////////////////////////////////////////////////
// updatePluginsList
////////////////////////////////////////////////
async function updatePluginsList() {
  const pluginsDiv = document.getElementById('superpowers-plugins');
  if (!pluginsDiv) return;
  try {
    const resp = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_PLUGINS" });
    if (resp?.plugins) {
      pluginsDiv.innerHTML = `
        <strong>Active Plugins:</strong><br>
        ${resp.plugins.map(p => `- ${p.name}`).join('<br>')}
      `;
    }
  } catch (err) {
    debugLog('Failed to get plugins list:', err, "warn");
  }
}

////////////////////////////////////////////////
// toggleSecret
////////////////////////////////////////////////
function toggleSecret(button) {
  try {
    const card = button.closest('.variable-card');
    const valInput = card?.querySelector('input[placeholder="VALUE"]');
    if (valInput) {
      valInput.type = (valInput.type === 'password') ? 'text' : 'password';
      button.textContent = (valInput.type === 'password') ? '👁️ Show' : '👁️ Hide';
    }
  } catch (err) {
    debugLog('Toggle error:', err, "error");
    showToast('Error toggling field visibility');
  }
}

////////////////////////////////////////////////
// removeRow (immediate storage removal)
////////////////////////////////////////////////
function removeRow(button) {
  try {
    const card = button.closest('.variable-card');
    if (!card) return;

    const oldKey = card.dataset.originalKey || "";

    if (!oldKey) {
      // Just remove from UI if no originalKey
      card.remove();
      showToast('Row removed (no stored key).');
      return;
    }

    // Actually remove from storage
    chrome.storage.local.get(['superEnvVars'], (res) => {
      if (chrome.runtime.lastError) {
        debugLog("Remove error:", chrome.runtime.lastError, "error");
        showToast('Error removing variable');
        return;
      }

      const store = res.superEnvVars || { default: {} };
      if (!store.default) store.default = {};
      if (!store.descriptions) store.descriptions = {};

      delete store.default[oldKey];
      delete store.descriptions[oldKey];

      chrome.storage.local.set({ superEnvVars: store }, () => {
        if (chrome.runtime.lastError) {
          debugLog('Remove error set:', chrome.runtime.lastError, "error");
          showToast('Error removing variable');
          return;
        }
        // Animate row removal
        card.style.opacity = '0';
        card.style.transform = 'translateX(100px)';
        setTimeout(() => {
          card.remove();
          showToast('Variable removed');
          // Reload environment in background
          loadEnvVars();
        }, 200);
      });
    });

  } catch (err) {
    debugLog('Remove error:', err, "error");
    showToast('Error removing variable');
  }
}

////////////////////////////////////////////////
// clearDebug
////////////////////////////////////////////////
function clearDebug() {
  try {
    if (debugOutputEl) {
      debugOutputEl.textContent = '';
      showToast('Debug output cleared');
    }
  } catch (err) {
    console.error("Error clearing debug:", err);
  }
}

////////////////////////////////////////////////
// handleVariableActions
////////////////////////////////////////////////
function handleVariableActions(ev) {
  const button = ev.target;
  if (!button.classList.contains('action-button')) return;

  if (button.classList.contains('toggle')) {
    toggleSecret(button);
  } else if (button.classList.contains('delete')) {
    removeRow(button);
  } else if (button.classList.contains('save')) {
    saveField(button);
  }
}
