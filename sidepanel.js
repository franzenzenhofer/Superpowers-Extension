// sidepanel.js
// Minimal logic to read/write environment variables in chrome.storage,
// displayed in side panel, plus a debug message listener, with improvements.

//////////////////////////////
// [IMPROVEMENT #4] Cache repeated DOM lookups
//////////////////////////////
const envContainerEl = document.getElementById("envContainer");
const debugOutputEl = document.getElementById("debugOutput");
const toastEl = document.getElementById("toast");

// We'll keep a max debug log lines
// [IMPROVEMENT #1] Limit debug logs to 100 lines
const MAX_DEBUG_LINES = 100;

// Add these constants at the top with other constants
const VIRTUAL_LIST_CONFIG = {
  rowHeight: 150, // Approximate height of each row in pixels
  bufferSize: 5,  // Extra rows to render above/below viewport
  recyclePool: new Map(), // Reuse DOM elements
  maxPoolSize: 50 // Maximum number of recycled elements to keep
};

// Add new state tracking for diffs
let previousEnvState = null;
const stateChangeTracker = {
  added: new Set(),
  modified: new Set(),
  removed: new Set()
};

//////////////////////////////
// Helper: showToast
//////////////////////////////
function showToast(message) {
    // [IMPROVEMENT #7] We remove an existing .show if present to avoid overlap
    toastEl.classList.remove("show");
    toastEl.textContent = message;

    // Force reflow so the next add('show') triggers properly
    // [Edge case] but helps avoid double toggles
    void toastEl.offsetWidth;

    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 3000);
}

//////////////////////////////
// Helper: debugLog
//////////////////////////////
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

  // Still log to console for development
  switch (level) {
    case "error":
      console.error(logEntry.message);
      break;
    case "warning":
      console.warn(logEntry.message);
      break;
    default:
      console.log(logEntry.message);
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
  
  while (debugOutputEl.children.length > MAX_DEBUG_LINES) {
    debugOutputEl.lastChild.remove();
  }

  logBuffer = [];
  debugOutputEl.scrollTop = 0;
}

//////////////////////////////
// Helper: safeAddEventListener
//////////////////////////////
function safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        debugLog(`Element ${elementId} not found`, null, "warn");
    }
}

//////////////////////////////
// onMessage debug handling
//////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SIDEPANEL_LOG") {
        debugLog(request.message);
        sendResponse({ success: true });
    }
});

//////////////////////////////
// init
//////////////////////////////
function init() {
    try {
        debugLog("Sidepanel initializing...");
        loadEnvVars();

        safeAddEventListener("addRowBtn", "click", addRow);
        safeAddEventListener("saveBtn", "click", saveEnvVars);
        safeAddEventListener("refreshEnvBtn", "click", refreshEnvTest);
        safeAddEventListener("clearDebugBtn", "click", clearDebug);
        safeAddEventListener("loadCredsBtn", "click", () => {
            window.location.href = chrome.runtime.getURL('pages/credentials_manager.html');
        });

        // Container for row actions
        envContainerEl.addEventListener('click', handleVariableActions);

        updatePluginsList();

        // Initialize tooltips
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                showToast(e.target.textContent);
            });
        });

        // [ADDED] Copy Superpowers Instructions for ChatGPT button
        const copyBtn = document.getElementById("copyInstructionsBtn");
        if (copyBtn) {
            copyBtn.addEventListener("click", async () => {
                try {
                    // Fetch the README-LLM.md text from extension
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
        
    } catch (error) {
        console.error("Initialization error:", error);
        debugLog("Initialization error:", error, "error");
    }
}

document.addEventListener("DOMContentLoaded", init);

//////////////////////////////
// loadEnvVars
//////////////////////////////
function loadEnvVars() {
    debugLog("Loading environment variables");
    chrome.storage.local.get(["superEnvVars"], (result) => {
        if (chrome.runtime.lastError) {
            debugLog("Error loading vars:", chrome.runtime.lastError, "error");
            return;
        }
        
        const vars = result.superEnvVars || {};
        const envVars = (typeof vars === 'object' && !Array.isArray(vars))
            ? (vars.default || vars)
            : {};

        debugLog("Loaded variables:", envVars, "info");
        renderRows(envVars);
    });
}

//////////////////////////////
// renderRows
//////////////////////////////
let renderRowsScheduled = false;
let lastEnvVarsData = null;

function renderRows(envVars) {
    if (!envContainerEl) {
        debugLog("No envContainer element found!", null, "error");
        return;
    }

    // Load descriptions together with variables
    chrome.storage.local.get(["superEnvVars"], (result) => {
        const vars = result.superEnvVars || {};
        const descriptions = vars.descriptions || {};

        // Clear the container
        envContainerEl.innerHTML = '<div class="rows-list"></div>';
        const container = envContainerEl.querySelector('.rows-list');
        
        // Simple direct rendering, one row after another, now with descriptions
        Object.entries(envVars).forEach(([key, value]) => {
            const desc = descriptions[key] || "";
            const row = createRow(key, value, desc);
            container.appendChild(row);
        });
    });
}

// Add diff calculation
function calculateDiffs(oldState, newState) {
    stateChangeTracker.added.clear();
    stateChangeTracker.modified.clear();
    stateChangeTracker.removed.clear();

    // Find added and modified
    for (const [key, value] of Object.entries(newState)) {
        if (!(key in oldState)) {
            stateChangeTracker.added.add(key);
        } else if (oldState[key] !== value) {
            stateChangeTracker.modified.add(key);
        }
    }

    // Find removed
    for (const key of Object.keys(oldState)) {
        if (!(key in newState)) {
            stateChangeTracker.removed.add(key);
        }
    }
}

//////////////////////////////
// createRow
//////////////////////////////
function createRow(keyVal = "", valVal = "", descVal = "") {
    const row = document.createElement("div");
    row.className = "variable-card";

    // Add an anchor ID so we can jump to sidepanel.html#KEY
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

//////////////////////////////
// addRow
//////////////////////////////
function addRow() {
    const newRow = createRow();
    if (envContainerEl.firstChild) {
        envContainerEl.insertBefore(newRow, envContainerEl.firstChild);
    } else {
        envContainerEl.appendChild(newRow);
    }
}

//////////////////////////////
// saveField
//////////////////////////////
async function saveField(button) {
    const card = button.closest('.variable-card');
    if (!card) {
        debugLog('Cannot find variable card', null, "error");
        showToast('Error: No variable card found');
        return;
    }

    const originalText = button.textContent;
    button.textContent = '💫 Saving...';
    button.disabled = true;

    const inputs = card.querySelectorAll('input');
    const key = inputs[0]?.value?.trim();
    const value = inputs[1]?.value;
    const description = inputs[2]?.value?.trim();

    if (!key) {
        showToast('Please enter a key name');
        button.textContent = originalText;
        button.disabled = false;
        return;
    }

    try {
        await new Promise((resolve, reject) => {
            chrome.storage.local.get(['superEnvVars'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                const vars = result.superEnvVars || { default: {} };
                if (!vars.default) vars.default = {};

                vars.default[key] = value;

                if (!vars.descriptions) vars.descriptions = {};
                if (description) {
                    vars.descriptions[key] = description;
                } else {
                    delete vars.descriptions[key];
                }

                chrome.storage.local.set({ superEnvVars: vars }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
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
        debugLog(`Saved field: ${key} = ${value}`, { description }, "info");
        // Reload to reflect changes
        loadEnvVars();
    } catch (error) {
        console.error("Error saving field:", error);
        showToast('Error saving field');
        debugLog("Error saving field:", error, "error");
        button.textContent = '❌ Error';
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);
    }
}

//////////////////////////////
// saveEnvVars
//////////////////////////////
function saveEnvVars() {
    const rows = envContainerEl.querySelectorAll(".variable-card");
    const newEnv = {};
    const newDesc = {};

    rows.forEach((row) => {
        const inputs = row.querySelectorAll("input");
        const k = inputs[0].value.trim();
        const v = inputs[1].value;
        const d = inputs[2].value.trim();
        if (k) {
            newEnv[k] = v;
            if (d) newDesc[k] = d;
        }
    });

    debugLog("Saving variables:", newEnv);

    chrome.storage.local.get(["superEnvVars"], (res) => {
        if (chrome.runtime.lastError) {
            debugLog("Error loading for saveAll:", chrome.runtime.lastError, "error");
            alert("Error loading prior environment!");
            return;
        }

        const vars = res.superEnvVars || {};
        if (!vars.default) vars.default = {};
        if (!vars.descriptions) vars.descriptions = {};

        // Overwrite default with newEnv
        vars.default = newEnv;

        // Overwrite or set descriptions
        for (const k of Object.keys(vars.descriptions)) {
            if (!newDesc[k]) {
                delete vars.descriptions[k];
            }
        }
        for (const k of Object.keys(newDesc)) {
            vars.descriptions[k] = newDesc[k];
        }

        chrome.storage.local.set({ superEnvVars: vars }, () => {
            if (chrome.runtime.lastError) {
                debugLog("Error saving:", chrome.runtime.lastError, "error");
                alert("Error saving variables!");
                return;
            }
            debugLog("Variables saved successfully", null, "info");
            alert("Variables saved!");
            checkSavedEnvVars(newEnv);
            loadEnvVars();
        });
    });
}

//////////////////////////////
// checkSavedEnvVars
//////////////////////////////
function checkSavedEnvVars(expectedEnv) {
    debugLog(`Verifying saved environment variables...`, null, "debug");
    chrome.storage.local.get(["superEnvVars"], (data) => {
        if (chrome.runtime.lastError) {
            debugLog("Error verifying saved vars:", chrome.runtime.lastError, "error");
            return;
        }

        const vars = data.superEnvVars || {};
        const actual = (typeof vars === 'object' && !Array.isArray(vars)) 
            ? (vars.default || vars)
            : {};

        const expectedStr = JSON.stringify(expectedEnv, null, 2);
        const actualStr = JSON.stringify(actual, null, 2);

        const matches = (expectedStr === actualStr);
        debugLog(`Verification ${matches ? 'SUCCESS' : 'FAILED'}`, { expectedEnv, actual }, matches ? "info" : "warn");
    });
}

//////////////////////////////
// refreshEnvTest
//////////////////////////////
function refreshEnvTest() {
    debugLog("Refreshing environment variables test panel...", null, "info");
    chrome.storage.local.get(["superEnvVars"], (result) => {
        if (chrome.runtime.lastError) {
            debugLog("Error loading vars for test:", chrome.runtime.lastError, "error");
            return;
        }

        const testOutput = document.getElementById("envTestOutput");
        if (!testOutput) {
            debugLog("No #envTestOutput found, skipping test display", null, "warn");
            return;
        }

        const vars = result.superEnvVars || {};
        let output = "Current Environment Variables:\n";
        output += "===========================\n\n";

        if (typeof vars === 'object') {
            const defaultVars = vars.default || {};
            if (Object.keys(defaultVars).length === 0) {
                output += "No environment variables set.\n";
            } else {
                for (const [key, value] of Object.entries(defaultVars)) {
                    output += `${key} = ${value}\n`;
                }
            }

            const otherEnvs = Object.keys(vars).filter(k => k !== 'default' && k !== 'descriptions');
            if (otherEnvs.length > 0) {
                output += "\nNamed Environments:\n";
                output += "===================\n\n";
                for (const envName of otherEnvs) {
                    output += `[${envName}]:\n`;
                    for (const [key, value] of Object.entries(vars[envName])) {
                        output += `  ${key} = ${value}\n`;
                    }
                    output += "\n";
                }
            }
        }
        
        output += "\nLast updated: " + new Date().toISOString();
        testOutput.textContent = output;

        debugLog("Test panel refreshed", null, "info");
    });
}

//////////////////////////////
// updatePluginsList
//////////////////////////////
async function updatePluginsList() {
    const pluginsDiv = document.getElementById('superpowers-plugins');
    if (!pluginsDiv) return;

    try {
        const response = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_PLUGINS" });
        if (response?.plugins) {
            pluginsDiv.innerHTML = `
                <strong>Active Plugins:</strong><br>
                ${response.plugins.map(p => `- ${p.name}`).join('<br>')}
            `;
        }
    } catch (err) {
        debugLog('Failed to get plugins list:', err, "warn");
    }
}

//////////////////////////////
// toggleSecret
//////////////////////////////
function toggleSecret(button) {
    try {
        const card = button.closest('.variable-card');
        const valueInput = card.querySelector('.input-group:nth-child(2) input');
        if (valueInput) {
            valueInput.type = (valueInput.type === 'password') ? 'text' : 'password';
            button.textContent = (valueInput.type === 'password') ? '👁️ Show' : '👁️ Hide';
        }
    } catch (error) {
        debugLog('Toggle error:', error, "error");
        showToast('Error toggling field visibility');
    }
}

//////////////////////////////
// removeRow
//////////////////////////////
function removeRow(button) {
    try {
        const card = button.closest('.variable-card');
        if (!card) return;

        // Get key before removal
        const key = card.querySelector('input').value;

        // Add to recycle pool if not too full
        if (VIRTUAL_LIST_CONFIG.recyclePool.size < VIRTUAL_LIST_CONFIG.maxPoolSize) {
            VIRTUAL_LIST_CONFIG.recyclePool.set(key, card.cloneNode(true));
        }

        card.style.opacity = '0';
        card.style.transform = 'translateX(100px)';
        setTimeout(() => {
            card.remove();
            if (!envContainerEl.querySelector('.rows-container').children.length) {
                addRow();
            }
            showToast('Variable removed');
        }, 200);
    } catch (error) {
        debugLog('Remove error:', error, "error");
        showToast('Error removing variable');
    }
}

//////////////////////////////
// clearDebug
//////////////////////////////
function clearDebug() {
    try {
        if (debugOutputEl) {
            debugOutputEl.textContent = '';
            showToast('Debug output cleared');
        }
    } catch (error) {
        console.error("Error clearing debug:", error);
    }
}

//////////////////////////////
// handleVariableActions
//////////////////////////////
function handleVariableActions(event) {
    const target = event.target;
    if (!target.classList.contains('action-button')) return;

    const button = target;
    if (button.classList.contains('toggle')) {
        toggleSecret(button);
    } else if (button.classList.contains('delete')) {
        removeRow(button);
    } else if (button.classList.contains('save')) {
        saveField(button);
    }
}
