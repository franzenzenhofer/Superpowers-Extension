// sidepanel.js
// Minimal logic to read/write environment variables in chrome.storage,
// displayed in side panel, plus a debug message listener.

document.addEventListener("DOMContentLoaded", init);

// Add debug helper
function debugLog(message, data = null) {
  const debugOut = document.getElementById("debugOutput");
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(logMsg, data || '');
  debugOut.textContent += logMsg + (data ? ` ${JSON.stringify(data)}` : '') + "\n";
  debugOut.scrollTop = debugOut.scrollHeight;
}

function init() {
  debugLog("Sidepanel initializing...");
  loadEnvVars();
  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("saveBtn").addEventListener("click", saveEnvVars);
  document.getElementById("refreshEnvBtn").addEventListener("click", refreshEnvTest);

  // Initial load of test panel
  refreshEnvTest();

  // Listen for debug logs (e.g. "SUPERPOWERS EXPOSED") coming from content_script:
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SIDEPANEL_LOG") {
      const debugOut = document.getElementById("debugOutput");
      debugOut.textContent += request.message + "\n";
      // optional: auto-scroll to bottom
      debugOut.scrollTop = debugOut.scrollHeight;
      sendResponse({ success: true });
    }
  });
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

function createRow(keyVal = "", valVal = "") {
  const row = document.createElement("div");
  row.className = "env-row";

  const keyInput = document.createElement("input");
  keyInput.placeholder = "KEY";
  keyInput.value = keyVal;

  const valInput = document.createElement("input");
  valInput.placeholder = "VALUE";
  valInput.value = valVal;

  const removeBtn = document.createElement("button");
  removeBtn.innerText = "X";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(keyInput);
  row.appendChild(valInput);
  row.appendChild(removeBtn);
  return row;
}

function addRow() {
  const container = document.getElementById("envContainer");
  container.appendChild(createRow());
}

function saveEnvVars() {
  const container = document.getElementById("envContainer");
  const rows = container.querySelectorAll(".env-row");
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
