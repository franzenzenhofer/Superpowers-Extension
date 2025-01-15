// sidepanel.js
// Minimal logic to read/write environment variables in chrome.storage,
// displayed in side panel, plus a debug message listener.

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function debugLog(message, data = null) {
    const debugOut = document.getElementById("debugOutput");
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${message}`;
    
    console.log(logMsg, data || '');
    
    const logEntry = document.createElement('div');
    logEntry.textContent = logMsg + (data ? ` ${JSON.stringify(data, null, 2)}` : '');
    
    debugOut.insertBefore(logEntry, debugOut.firstChild);
    debugOut.scrollTop = 0;
}

function init() {
    try {
        debugLog("Sidepanel initializing...");
        loadEnvVars();
        
        // Add event listeners with error handling
        safeAddEventListener("addRowBtn", "click", addRow);
        safeAddEventListener("saveBtn", "click", saveEnvVars);
        safeAddEventListener("refreshEnvBtn", "click", refreshEnvTest);
        safeAddEventListener("clearDebugBtn", "click", clearDebug);
        safeAddEventListener("closePanelBtn", "click", closePanel);

        // Setup event delegation for the variables container
        const container = document.getElementById("envContainer");
        container.addEventListener('click', handleVariableActions);

        // Listen for debug logs
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === "SIDEPANEL_LOG") {
                debugLog(request.message);
                sendResponse({ success: true });
            }
        });

        updatePluginsList();

        // Initialize tooltips
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                const text = e.target.textContent;
                showToast(text);
            });
        });
    } catch (error) {
        console.error("Initialization error:", error);
        debugLog("Initialization error:", error);
    }
}

// Helper function for safer event listener addition
function safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element ${elementId} not found`);
    }
}

function loadEnvVars() {
  debugLog("Loading environment variables");
  chrome.storage.local.get(["superEnvVars"], (result) => {
    if (chrome.runtime.lastError) {
      debugLog("Error loading vars:", chrome.runtime.lastError);
      return;
    }
    
    // For backward compatibility, handle both old and new format
    const vars = result.superEnvVars || {};
    const envVars = typeof vars === 'object' && !Array.isArray(vars) ? 
                   (vars.default || vars) : {};
    
    debugLog("Loaded variables:", envVars);
    renderRows(envVars);
  });
}

function renderRows(envVars) {
  const container = document.getElementById("envContainer");
  container.innerHTML = "";
  Object.entries(envVars).forEach(([k, v]) => {
    container.appendChild(createRow(k, v));
  });
}

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
            <input type="text" class="super-input" placeholder="VALUE" value="${valVal}">
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

    // Initialize value field as password type
    const valueInput = row.querySelector('.input-group:nth-child(2) input');
    if (valueInput) {
        valueInput.type = 'password';
    }

    return row;
}

function addRow() {
    const container = document.getElementById("envContainer");
    const newRow = createRow();
    if (container.firstChild) {
        container.insertBefore(newRow, container.firstChild);
    } else {
        container.appendChild(newRow);
    }
}

// Improved save field functionality
async function saveField(button) {
    try {
        const card = button.closest('.variable-card');
        if (!card) throw new Error('Cannot find variable card');
        
        // Show saving state
        const originalText = button.textContent;
        button.textContent = '💫 Saving...';
        button.disabled = true;
        
        const inputs = card.querySelectorAll('input');
        const key = inputs[0]?.value?.trim();
        const value = inputs[1]?.value;
        const description = inputs[2]?.value?.trim();
        
        if (!key) {
            showToast('Please enter a key name');
            return;
        }

        await new Promise((resolve, reject) => {
            chrome.storage.local.get(['superEnvVars'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                const vars = result.superEnvVars || { default: {} };
                vars.default[key] = value;
                
                // Save description if provided
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

        // Success animation
        button.textContent = '✅ Saved!';
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);

        showToast(`Saved: ${key}`);
        debugLog(`Saved field: ${key} = ${value}${description ? ` (${description})` : ''}`);
    } catch (error) {
        console.error("Error saving field:", error);
        showToast('Error saving field');
        debugLog("Error saving field:", error);
        button.textContent = '❌ Error';
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);
    }
}

function saveEnvVars() {
  const container = document.getElementById("envContainer");
  const rows = container.querySelectorAll(".variable-card");
  const newEnv = {};
  
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    const k = inputs[0].value.trim();
    const v = inputs[1].value;
    if (k) newEnv[k] = v;
  });

  debugLog("Saving variables:", newEnv);

  // For backward compatibility, save in both formats
  chrome.storage.local.set({ 
    superEnvVars: {
      default: newEnv
    }
  }, () => {
    if (chrome.runtime.lastError) {
      debugLog("Error saving:", chrome.runtime.lastError);
      alert("Error saving variables!");
      return;
    }
    debugLog("Variables saved successfully");
    alert("Variables saved!");
    checkSavedEnvVars(newEnv);
  });
}

// New helper: verify and log debug output
function checkSavedEnvVars(expectedEnv) {
  debugLog(`Verifying saved environment variables...`);
  
  chrome.storage.local.get(["superEnvVars"], (data) => {
    if (chrome.runtime.lastError) {
      debugLog("Error verifying saved vars:", chrome.runtime.lastError);
      return;
    }

    const vars = data.superEnvVars || {};
    const actual = typeof vars === 'object' && !Array.isArray(vars) ? 
                   (vars.default || vars) : {};
    
    const expectedStr = JSON.stringify(expectedEnv, null, 2);
    const actualStr = JSON.stringify(actual, null, 2);
    
    const matches = expectedStr === actualStr;
    
    debugLog(`Verification ${matches ? 'SUCCESS' : 'FAILED'}`, {
      expected: expectedEnv,
      actual: actual
    });
  });
}

// Add new function for test panel
function refreshEnvTest() {
  debugLog("Refreshing environment variables test panel...");
  
  chrome.storage.local.get(["superEnvVars"], (result) => {
    if (chrome.runtime.lastError) {
      debugLog("Error loading vars for test:", chrome.runtime.lastError);
      return;
    }
    
    const testOutput = document.getElementById("envTestOutput");
    const vars = result.superEnvVars || {};
    
    // Format the output nicely
    let output = "Current Environment Variables:\n";
    output += "===========================\n\n";
    
    if (typeof vars === 'object') {
      // Handle both old and new formats
      const defaultVars = vars.default || vars;
      
      if (Object.keys(defaultVars).length === 0) {
        output += "No environment variables set.\n";
      } else {
        Object.entries(defaultVars).forEach(([key, value]) => {
          output += `${key} = ${value}\n`;
        });
      }
      
      // If we have other named environments, show them too
      const otherEnvs = Object.keys(vars).filter(k => k !== 'default');
      if (otherEnvs.length > 0) {
        output += "\nNamed Environments:\n";
        output += "===================\n\n";
        otherEnvs.forEach(envName => {
          output += `[${envName}]:\n`;
          Object.entries(vars[envName]).forEach(([key, value]) => {
            output += `  ${key} = ${value}\n`;
          });
          output += "\n";
        });
      }
    }
    
    output += "\nLast updated: " + new Date().toISOString();
    testOutput.textContent = output;
    
    debugLog("Test panel refreshed");
  });
}

// In sidepanel.js, add:
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
    console.warn('Failed to get plugins list:', err);
  }
}

function toggleSecret(button) {
    try {
        const card = button.closest('.variable-card');
        const valueInput = card.querySelector('.input-group:nth-child(2) input');
        if (valueInput) {
            valueInput.type = valueInput.type === 'password' ? 'text' : 'password';
            button.textContent = valueInput.type === 'password' ? '👁️ Show' : '👁️ Hide';
        }
    } catch (error) {
        console.error('Toggle error:', error);
        showToast('Error toggling field visibility');
    }
}

function removeRow(button) {
    try {
        const card = button.closest('.variable-card');
        if (!card) return;

        // Animate removal
        card.style.opacity = '0';
        card.style.transform = 'translateX(100px)';
        
        setTimeout(() => {
            card.remove();
            // If no variables left, add an empty one
            const container = document.getElementById('envContainer');
            if (!container.children.length) {
                addRow();
            }
            showToast('Variable removed');
        }, 200);
    } catch (error) {
        console.error('Remove error:', error);
        showToast('Error removing variable');
    }
}

// Improved debug clear functionality
function clearDebug() {
    try {
        const debugOut = document.getElementById("debugOutput");
        if (debugOut) {
            debugOut.textContent = '';
            showToast('Debug output cleared');
        }
    } catch (error) {
        console.error("Error clearing debug:", error);
    }
}

// Add new event delegation handler
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

// Add close panel functionality
async function closePanel() {
    try {
        await chrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" });
    } catch (error) {
        console.error("Error closing panel:", error);
    }
}
