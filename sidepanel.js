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
function debugLog(message, data = null, level = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}][${level}] ${message}`;
    
    console.log(logMsg, data || '');

    // Insert in debug UI
    if (!debugOutputEl) return;

    const logEntry = document.createElement('div');
    logEntry.textContent = logMsg + (data ? ` ${JSON.stringify(data, null, 2)}` : '');

    debugOutputEl.insertBefore(logEntry, debugOutputEl.firstChild);

    // [IMPROVEMENT #1] Limit debug lines
    if (debugOutputEl.children.length > MAX_DEBUG_LINES) {
        debugOutputEl.removeChild(debugOutputEl.lastChild);
    }
    // [IMPROVEMENT #8] If needed, we can scroll to top
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
// [IMPROVEMENT #2] Throttle or batch if huge updates (simple approach)
let renderRowsScheduled = false;
let lastEnvVarsData = null;

function renderRows(envVars) {
    // [IMPROVEMENT #3] Change detection:
    const envVarsStr = JSON.stringify(envVars);
    if (envVarsStr === lastEnvVarsData) {
        // No changes => skip re-render
        debugLog("No env var changes, skipping re-render.", null, "debug");
        return;
    }
    lastEnvVarsData = envVarsStr;

    if (!renderRowsScheduled) {
        renderRowsScheduled = true;
        requestAnimationFrame(() => {
            doRenderRows(envVars);
            renderRowsScheduled = false;
        });
    }
}

function doRenderRows(envVars) {
    debugLog("Rendering rows now...", envVars, "debug");
    envContainerEl.innerHTML = "";

    // [IMPROVEMENT #19] We can sort by key if desired
    const keys = Object.keys(envVars).sort();
    for (const k of keys) {
        envContainerEl.appendChild(createRow(k, envVars[k]));
    }
}

//////////////////////////////
// createRow
//////////////////////////////
function createRow(keyVal = "", valVal = "", descVal = "") {
    const row = document.createElement("div");
    row.className = "variable-card";
    row.innerHTML = `
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
            <!-- [IMPROVEMENT #16] Could use <textarea> if multi-line is needed -->
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
                if (description) {
                    if (!vars.descriptions) vars.descriptions = {};
                    vars.descriptions[key] = description;
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

    rows.forEach((row) => {
        const inputs = row.querySelectorAll("input");
        const k = inputs[0].value.trim();
        const v = inputs[1].value;
        if (k) newEnv[k] = v;
    });

    debugLog("Saving variables:", newEnv);

    chrome.storage.local.set({
        superEnvVars: { default: newEnv }
    }, () => {
        if (chrome.runtime.lastError) {
            debugLog("Error saving:", chrome.runtime.lastError, "error");
            alert("Error saving variables!");
            return;
        }
        debugLog("Variables saved successfully", null, "info");
        alert("Variables saved!");
        checkSavedEnvVars(newEnv);
        // reload
        loadEnvVars();
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

            const otherEnvs = Object.keys(vars).filter(k => k !== 'default');
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

        card.style.opacity = '0';
        card.style.transform = 'translateX(100px)';
        setTimeout(() => {
            card.remove();
            // If no variables left, add an empty one
            if (!envContainerEl.children.length) {
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
