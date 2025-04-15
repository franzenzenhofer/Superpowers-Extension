// sidepanel.js
//
// Minimal logic for reading/writing environment variables in chrome.storage,
// displayed in a side panel, plus a debug message listener, with bug fixes:
//   - Changing a variable's "Key" now removes the old key from storage
//   - Deleting a row removes it from storage immediately
//   - Clear, straightforward row-based saving
//
// ***KISS / robust approach***
//
////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////
const ENV_CONTAINER_ID = "envContainer";
const DEBUG_OUTPUT_ID = "debugOutput";
const TOAST_ID = "toast";
const ADD_ROW_BTN_ID = "addRowBtn";
const SAVE_ALL_BTN_ID = "saveBtn"; // Renamed from saveBtn to avoid conflict with row save buttons
const CLEAR_DEBUG_BTN_ID = "clearDebugBtn";
const LOAD_CREDS_BTN_ID = "loadCredsBtn";
const COPY_INSTRUCTIONS_BTN_ID = "copyInstructionsBtn";

const VARIABLE_CARD_CLASS = "variable-card";
const ACTION_BUTTON_CLASS = "action-button";
const ROWS_LIST_SELECTOR = ".rows-list";
const INPUT_SELECTOR = "input";
const VALUE_INPUT_SELECTOR = 'input[placeholder="VALUE"]';

// Storage Keys
const STORAGE_KEY = "superEnvVars";
const DEFAULT_ENV_SET_KEY = "default";
const DESCRIPTIONS_KEY = "descriptions";

// Class names for actions/states
const ACTION_TOGGLE_CLASS = "toggle";
const ACTION_DELETE_CLASS = "delete";
const ACTION_SAVE_CLASS = "save";
const TOAST_SHOW_CLASS = "show";
const LOG_ENTRY_CLASS = "log-entry"; // For debug logs
const UPDATE_NOTICE_CLASS = "update-notice"; // For version updates

// Button states & attributes
const BUTTON_ORIGINAL_TEXT_ATTR = 'data-original-text';

// Limit debug logs
const MAX_DEBUG_LINES = 100;

////////////////////////////////////////////////
// DOM Element References (declare, assign in init)
////////////////////////////////////////////////
let envContainerEl = null;
let debugOutputEl = null;
let toastEl = null;

////////////////////////////////////////////////
// Chrome Storage Helpers
////////////////////////////////////////////////
function getStorageData(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result);
    });
  });
}

function setStorageData(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

////////////////////////////////////////////////
// Toast utility
////////////////////////////////////////////////
function showToast(message) {
  if (!toastEl) {
    console.warn("Toast element not found, cannot show toast:", message);
    return;
  }
  toastEl.classList.remove(TOAST_SHOW_CLASS);
  toastEl.textContent = message;
  // Force a reflow so removing/adding class triggers properly
  void toastEl.offsetWidth;
  toastEl.classList.add(TOAST_SHOW_CLASS);

  setTimeout(() => {
    if (toastEl) toastEl.classList.remove(TOAST_SHOW_CLASS); // Check again in timeout
  } , 3000);
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
    entry.className = `${LOG_ENTRY_CLASS} ${log.level}`; // Use constant
    entry.textContent = `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`;
    fragment.appendChild(entry);
  });

  debugOutputEl.insertBefore(fragment, debugOutputEl.firstChild);

  // Keep only up to MAX_DEBUG_LINES
  while (debugOutputEl.children.length > MAX_DEBUG_LINES) {
    if (debugOutputEl.lastChild) { // Check if lastChild exists
       debugOutputEl.lastChild.remove();
    } else {
       break; // Should not happen, but safety break
    }
  }
  logBuffer = [];
  // Only scroll if the user hasn't scrolled up
  if (debugOutputEl.scrollTop === 0 || debugOutputEl.scrollHeight - debugOutputEl.scrollTop === debugOutputEl.clientHeight) {
    debugOutputEl.scrollTop = 0;
  }
}

////////////////////////////////////////////////
// Safe addEventListener (For top-level buttons identified by ID)
////////////////////////////////////////////////
function safeAddEventListener(id, eventName, handler) {
  const el = document.getElementById(id);
  if (!el) {
    debugLog(`Element #${id} not found, cannot add listener`, null, "warn");
    return false; // Indicate failure
  }
  el.addEventListener(eventName, handler);
  return true; // Indicate success
}

////////////////////////////////////////////////
// Chrome runtime message listening
////////////////////////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Note: SIDEPANEL_LOG handling might be better integrated with debugLog if structure allows
  if (request.type === "SIDEPANEL_LOG") {
    // Re-use existing debugLog system for consistency
    debugLog(request.message, null, request.level || "info");
    sendResponse({ success: true });
  } else if ((request.type === "VERSION_CHECK" || request.type === "SIDEPANEL_VERSION_UPDATE") && request.latestVersion) {
    showUpdateNotice(request);
  }
  // Indicate async response potentially possible, though not used here currently
  // return true;
});

function hasExistingUpdateNotice() {
  return document.querySelector(`.${UPDATE_NOTICE_CLASS}`) !== null; // Use constant
}

// Single update notice handler with timestamp tracking
let lastUpdateTimestamp = 0;
const UPDATE_COOLDOWN = 1000; // 1 second cooldown between notices

function showUpdateNotice(info) {
  // Don't add if we already have an update notice
  if (hasExistingUpdateNotice()) {
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
  updateNotice.className = UPDATE_NOTICE_CLASS; // Use constant
  updateNotice.innerHTML = `
    <div style="background:#fff3cd;color:#856404;padding:8px;margin:8px;border-radius:4px;border:1px solid #ffeeba;">
      Update Available: v${info.latestVersion}
      <a href="${info.updateUrl}" target="_blank" style="color:#533f03;text-decoration:underline;">Update Now</a>
    </div>
  `;
  // Insert safely, checking document.body
  if (document.body) {
      document.body.insertBefore(updateNotice, document.body.firstChild);
  } else {
      console.warn("Document body not ready for update notice.");
      // Optionally, retry later or queue
  }
}

////////////////////////////////////////////////
// init
////////////////////////////////////////////////
function init() {
  try { // Wrap init in try/catch
    // Assign DOM elements here
    envContainerEl = document.getElementById(ENV_CONTAINER_ID);
    debugOutputEl = document.getElementById(DEBUG_OUTPUT_ID);
    toastEl = document.getElementById(TOAST_ID);

    // *** Add checks immediately after assignment ***
    if (!envContainerEl) {
        console.error("Critical Error: Environment container element not found.");
        showToast("Initialization failed: UI element missing.");
        // Optionally disable buttons or return early
        return;
    }
    if (!debugOutputEl) {
        console.error("Error: Debug output element not found.");
        // Don't halt, but debug logging to UI might fail
    }
    if (!toastEl) {
        console.error("Error: Toast element not found.");
        // Toasts won't show
    }

    debugLog("Sidepanel initializing...");

    // Display version
    try {
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version;
        const versionInfoEl = document.getElementById('versionInfo');
        if (versionInfoEl) {
            versionInfoEl.textContent = `v${version}`;
            debugLog(`Running Superpowers Extension v${version}`);
        } else {
            debugLog("Version info element #versionInfo not found", null, "warn");
        }
    } catch (err) {
        debugLog("Error retrieving/displaying version info:", err, "error");
    }

    chrome.runtime.sendMessage({ type: "CHECK_VERSION_QUIET" }); // Fire-and-forget is okay

    loadEnvVars(); // This is async now, errors handled inside

    // Setup event listeners using safeAddEventListener for top-level buttons
    safeAddEventListener(ADD_ROW_BTN_ID, "click", addRow);
    safeAddEventListener(SAVE_ALL_BTN_ID, "click", saveEnvVars);
    safeAddEventListener(CLEAR_DEBUG_BTN_ID, "click", clearDebug);

    safeAddEventListener(LOAD_CREDS_BTN_ID, "click", () => {
      // Consider making this safer (check chrome.runtime.getURL result)
      window.location.href = chrome.runtime.getURL('pages/credentials_manager.html');
    });

    // Add listener directly to cached element (already checked for existence)
    envContainerEl.addEventListener('click', handleVariableActions);

    // Copy instructions button - Use safeAddEventListener pattern
    const copyBtn = document.getElementById(COPY_INSTRUCTIONS_BTN_ID);
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try { // Inner try/catch for specific async action
          const readmeUrl = chrome.runtime.getURL("README-LLM.md");
          const resp = await fetch(readmeUrl);
          if (!resp.ok) throw new Error(`Failed to fetch README: ${resp.statusText}`); // Check fetch response
          const text = await resp.text();
          await navigator.clipboard.writeText(text);
          showToast("Superpowers instructions copied to clipboard!");
          debugLog("Copied Superpowers instructions to clipboard");
        } catch (err) {
          console.error("Error copying instructions:", err);
          showToast("Failed to copy instructions");
          debugLog("Error copying instructions:", err, "error"); // Log the error
        }
      });
    } else {
         debugLog(`Button #${COPY_INSTRUCTIONS_BTN_ID} not found`, null, "warn");
    }

  } catch (err) { // Catch synchronous errors during init setup
    console.error("Initialization error:", err);
    // Use debugLog if available, otherwise console
    if (typeof debugLog === 'function') {
        debugLog("Initialization error:", err, "error");
    }
    // Attempt to show toast if available
    if (toastEl && typeof showToast === 'function') {
        showToast("Sidepanel failed to initialize");
    }
  }
}
document.addEventListener("DOMContentLoaded", init);

////////////////////////////////////////////////
// loadEnvVars
////////////////////////////////////////////////
async function loadEnvVars() {
  debugLog("Loading environment variables");
  try {
    const storageResult = await getStorageData([STORAGE_KEY]); // Use helper
    const storedData = storageResult[STORAGE_KEY] || {}; // Rename 'res'/'vars'
    // Ensure storedData is an object before accessing keys
    let defaultEnvVariables = (typeof storedData === 'object' && !Array.isArray(storedData)) ? (storedData[DEFAULT_ENV_SET_KEY] || storedData) : {}; // Rename 'envVars', use constants

    // Ensure OPENAI_API_KEY exists for the UI, even if empty
    // Check using hasOwnProperty for robustness
    if (!defaultEnvVariables.hasOwnProperty('OPENAI_API_KEY')) {
        debugLog("Defaulting OPENAI_API_KEY to empty string for UI.", null, "info");
        // Create a new object to avoid modifying the original potentially shared reference from storage directly
        defaultEnvVariables = { ...defaultEnvVariables, 'OPENAI_API_KEY': '' };
    }

    debugLog("Loaded variables:", defaultEnvVariables, "info");
    // previousEnvState = structuredClone(defaultEnvVariables); // Update state if tracker used
    await renderRows(defaultEnvVariables); // renderRows is now async
  } catch (error) {
     debugLog("Error loading vars:", error, "error");
     showToast("Error loading environment variables"); // User feedback
  }
}

////////////////////////////////////////////////
// renderRows
////////////////////////////////////////////////
async function renderRows(envVars) { // Make async to use storage helper
  if (!envContainerEl) {
    debugLog("Cannot render rows, container element not found!", null, "error");
    return;
  }
  try {
    const storageResult = await getStorageData([STORAGE_KEY]); // Use helper to get descriptions
    const storedData = storageResult[STORAGE_KEY] || {};
    const descriptions = storedData[DESCRIPTIONS_KEY] || {};

    // Use selector constant, ensure class name starts without '.' for direct use
    envContainerEl.innerHTML = `<div class="${ROWS_LIST_SELECTOR.substring(1)}"></div>`;
    const container = envContainerEl.querySelector(ROWS_LIST_SELECTOR); // Use constant
     if (!container) {
         debugLog("Row list container could not be created/found.", null, "error");
         return;
     }

    // Clear previous state if using tracker
    // stateChangeTracker.added.clear();
    // stateChangeTracker.modified.clear();
    // stateChangeTracker.removed.clear();

    Object.entries(envVars).forEach(([key, value]) => {
      const desc = descriptions[key] || "";
      const row = createRow(key, value, desc);
      container.appendChild(row);
    });
    debugLog(`Rendered ${Object.keys(envVars).length} rows.`);

    // Placeholder for virtual list init/update if implemented
    // initOrUpdateVirtualList(container, Object.entries(envVars), descriptions);

  } catch (error) {
      debugLog("Error getting descriptions or rendering rows:", error, "error");
      showToast("Error displaying environment variables");
      // Potentially render without descriptions or show an error message in the container
      envContainerEl.innerHTML = `<div class="error-message">Failed to load variable details.</div>`;
  }
}

////////////////////////////////////////////////
// createRow
////////////////////////////////////////////////
function createRow(keyVal = "", valVal = "", descVal = "") {
  const row = document.createElement("div");
  row.className = VARIABLE_CARD_CLASS; // Use constant
  row.dataset.originalKey = keyVal; // Store original key for updates/deletes

  // Removed anchor tag <a> line as it seems unused
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
    </div>
    <div class="variable-actions">
      <div class="action-row">
        <button class="${ACTION_BUTTON_CLASS} ${ACTION_TOGGLE_CLASS}">👁️ Show</button> <!-- Use constants -->
        <button class="${ACTION_BUTTON_CLASS} ${ACTION_DELETE_CLASS}">❌ Remove</button> <!-- Use constants -->
      </div>
      <button class="${ACTION_BUTTON_CLASS} ${ACTION_SAVE_CLASS}">💾 Save</button> <!-- Use constants -->
    </div>
  `;
  return row;
}

////////////////////////////////////////////////
// Row Data Helper
////////////////////////////////////////////////
function getRowData(rowElement) {
    if (!rowElement) {
        debugLog("getRowData called with null element", null, "warn");
        return null;
    }
    const inputs = rowElement.querySelectorAll(INPUT_SELECTOR); // Use constant
    if (inputs.length < 3) {
        debugLog("getRowData found insufficient inputs in row", rowElement, "warn");
        return null; // Expecting key, value, description
    }

    return {
        key: inputs[0].value.trim(),
        value: inputs[1].value, // Don't trim value (might be intentional spaces)
        description: inputs[2].value.trim(),
        originalKey: rowElement.dataset.originalKey || "" // Retrieve original key
    };
}


////////////////////////////////////////////////
// addRow
////////////////////////////////////////////////
function addRow() {
  if (!envContainerEl) {
    debugLog("Cannot add row, container not found", null, "error");
    showToast("Error: Cannot add new variable row");
    return;
  }
  const container = envContainerEl.querySelector(ROWS_LIST_SELECTOR);
  if (!container) {
      debugLog("Cannot add row, list container not found", null, "error");
      showToast("Error: Cannot add new variable row");
      return;
  }
  const newRow = createRow("", "", "");
  container.appendChild(newRow);
  // Optional: Scroll to the new row
  newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // Optional: Focus the key input
  const keyInput = newRow.querySelector('input[placeholder="KEY"]');
  if(keyInput) keyInput.focus();
  debugLog("Added new empty row");
  // stateChangeTracker.added.add(''); // Track addition if using tracker
}

////////////////////////////////////////////////
// Button State Helper
////////////////////////////////////////////////
function setButtonState(button, state) {
    if (!button) {
        debugLog("setButtonState called with null button", null, "warn");
        return;
    }

    // Store original text if not already stored
    if (!button.hasAttribute(BUTTON_ORIGINAL_TEXT_ATTR)) {
        button.setAttribute(BUTTON_ORIGINAL_TEXT_ATTR, button.textContent);
    }
    const originalText = button.getAttribute(BUTTON_ORIGINAL_TEXT_ATTR) || 'Save'; // Fallback

    button.disabled = false; // Default to enabled

    switch (state) {
        case 'saving':
            button.textContent = '💫 Saving...';
            button.disabled = true;
            break;
        case 'saved':
            button.textContent = '✅ Saved!';
            // Reset after delay
            setTimeout(() => setButtonState(button, 'idle'), 1500);
            break;
        case 'error':
            button.textContent = '❌ Error';
             // Reset after delay
            setTimeout(() => setButtonState(button, 'idle'), 1500);
            break;
        case 'idle':
        default:
            button.textContent = originalText;
            // Restore original disabled state if needed? Usually just enable.
            button.disabled = false;
            break;
    }
}

////////////////////////////////////////////////
// saveField (Handles saving a single row)
////////////////////////////////////////////////
async function saveField(button) {
  const card = button.closest(`.${VARIABLE_CARD_CLASS}`); // Use constant
  if (!card) {
      debugLog("Save failed: Could not find parent card.", button, "error");
      showToast("Error: Could not save variable.");
      return;
  }

  const rowData = getRowData(card);
  if (!rowData) {
      debugLog("Save failed: Could not read row data.", card, "error");
      showToast("Error: Could not read variable data.");
      setButtonState(button, 'error'); // Indicate error on the specific button
      return;
  }

  const { key, value, description, originalKey } = rowData;

  if (!key) {
      showToast('Please enter a key for the variable.');
      // Optionally highlight the key input field
      const keyInput = card.querySelector('input[placeholder="KEY"]');
      if (keyInput) keyInput.focus();
      // No state change needed if button wasn't 'saving'
      return;
  }

  setButtonState(button, 'saving'); // Set state to saving

  try {
      const storageResult = await getStorageData([STORAGE_KEY]);
      // *** IMPORTANT: Work on a copy to avoid modifying the cached result if storage fails ***
      const store = structuredClone(storageResult[STORAGE_KEY] || { [DEFAULT_ENV_SET_KEY]: {}, [DESCRIPTIONS_KEY]: {} });

      // Ensure nested objects exist
      if (!store[DEFAULT_ENV_SET_KEY]) store[DEFAULT_ENV_SET_KEY] = {};
      if (!store[DESCRIPTIONS_KEY]) store[DESCRIPTIONS_KEY] = {};

      // If the key changed, remove the old entry
      if (originalKey && originalKey !== key) {
        debugLog(`Key changed from "${originalKey}" to "${key}". Removing old entry.`);
        delete store[DEFAULT_ENV_SET_KEY][originalKey];
        delete store[DESCRIPTIONS_KEY][originalKey];
        // Track removal/modification if using tracker
        // stateChangeTracker.removed.add(originalKey);
        // stateChangeTracker.modified.add(key);
      }
      // } else if (originalKey === key) {
      //   // Track modification if using tracker and key hasn't changed
      //   stateChangeTracker.modified.add(key);
      // } else {
      //   // Track addition if using tracker and it's a new key
      //   stateChangeTracker.added.add(key);
      // }


      // Set the new key/value/description
      store[DEFAULT_ENV_SET_KEY][key] = value;
      if (description) {
          store[DESCRIPTIONS_KEY][key] = description;
      } else {
          // Explicitly delete description if empty, to keep storage clean
          delete store[DESCRIPTIONS_KEY][key];
      }

      // Update the row's known "originalKey" BEFORE saving, so it's correct if save fails/retries
      card.dataset.originalKey = key;

      await setStorageData({ [STORAGE_KEY]: store });

      setButtonState(button, 'saved'); // Set state to saved
      showToast(`Saved: ${key}`);
      debugLog(`Saved field: ${key}`, null, "info");
      // No need to reload all vars, UI is already up-to-date for this row
      // Consider selectively updating internal state if needed instead of full reload
      // await loadEnvVars(); // Avoid full reload if possible

  } catch (err) {
       console.error("Error saving field:", err);
       debugLog("Error saving field:", err, "error");
       setButtonState(button, 'error'); // Set state to error
       showToast(`Error saving: ${key}`);
  }
}


////////////////////////////////////////////////
// saveEnvVars (Handles "Save All" button)
////////////////////////////////////////////////
async function saveEnvVars() { // Make async
  if (!envContainerEl) {
      debugLog("Cannot save all, container not found", null, "error");
      showToast("Error: Cannot save variables");
      return;
  }
  const rows = envContainerEl.querySelectorAll(`.${VARIABLE_CARD_CLASS}`); // Use constant
  const newEnv = {};
  const newDescs = {};
  const updatedOriginalKeys = new Map(); // Track original keys for rows being saved

  debugLog(`Attempting to save all ${rows.length} rows.`);

  rows.forEach((rowElement) => {
    const rowData = getRowData(rowElement); // Use helper
    if (rowData && rowData.key) { // Check rowData exists and has a key
      newEnv[rowData.key] = rowData.value; // Use renamed variables
      if (rowData.description) { // Use renamed variable
        newDescs[rowData.key] = rowData.description;
      }
      // Store the original key associated with this element for cleanup later
      if(rowData.originalKey) {
          updatedOriginalKeys.set(rowElement, rowData.originalKey);
      }
      // Update the element's dataset *before* potential save, for consistency
      rowElement.dataset.originalKey = rowData.key;
    } else if (rowData && !rowData.key) {
        debugLog("Skipping row with empty key during Save All", rowElement, "warn");
    } else {
        debugLog("Skipping invalid row during Save All", rowElement, "warn");
    }
  });

  debugLog("Collected data for Save All:", { newEnv, newDescs });

  // Show global feedback (e.g., disable Save All button)
  const saveAllButton = document.getElementById(SAVE_ALL_BTN_ID);
  if (saveAllButton) setButtonState(saveAllButton, 'saving');

  try {
      const storageResult = await getStorageData([STORAGE_KEY]);
      const store = structuredClone(storageResult[STORAGE_KEY] || { [DEFAULT_ENV_SET_KEY]: {}, [DESCRIPTIONS_KEY]: {} });

      // Ensure nested objects exist
      if (!store[DEFAULT_ENV_SET_KEY]) store[DEFAULT_ENV_SET_KEY] = {};
      if (!store[DESCRIPTIONS_KEY]) store[DESCRIPTIONS_KEY] = {};

      // More robust update: Create the new state completely
      // Then, figure out which old keys are *no longer* present in the new state
      const currentKeys = new Set(Object.keys(newEnv));
      const oldKeys = new Set(Object.keys(store[DEFAULT_ENV_SET_KEY]));
      const keysToDelete = new Set([...oldKeys].filter(k => !currentKeys.has(k)));

      keysToDelete.forEach(key => {
          delete store[DEFAULT_ENV_SET_KEY][key];
          delete store[DESCRIPTIONS_KEY][key];
          debugLog(`Save All: Removing key "${key}" no longer present in UI.`);
      });

      // Update store with the current UI state
      store[DEFAULT_ENV_SET_KEY] = newEnv;
      store[DESCRIPTIONS_KEY] = newDescs;


      await setStorageData({ [STORAGE_KEY]: store });

      debugLog("Successfully saved all variables.");
      showToast('All variables saved successfully!');
      if (saveAllButton) setButtonState(saveAllButton, 'saved');

      // Reload to ensure consistency, although ideally UI state matches storage now
      await loadEnvVars();

  } catch (error) {
      console.error("Error saving all variables:", error);
      debugLog("Error saving all variables:", error, "error");
      showToast('Error saving all variables!');
      if (saveAllButton) setButtonState(saveAllButton, 'error');
  }
}

////////////////////////////////////////////////
// clearDebug
////////////////////////////////////////////////
function clearDebug() {
  try {
    if (debugOutputEl) {
      debugOutputEl.innerHTML = ''; // More efficient than textContent = ''
      logBuffer = []; // Clear buffer too
      showToast('Debug output cleared');
      debugLog("Debug output cleared by user."); // Log the action itself
    } else {
       debugLog("Cannot clear debug, output element not found.", null, "warn");
    }
  } catch (err) {
    console.error("Error clearing debug:", err);
    // Avoid logging to debugLog here as it might be the source of issues
  }
}


////////////////////////////////////////////////
// handleVariableActions (Event delegation for rows)
////////////////////////////////////////////////
function handleVariableActions(ev) {
  // Ensure target is a valid element and a button within the container
  if (!ev.target || !(ev.target instanceof HTMLElement)) return;

  const button = ev.target.closest('button'); // Find the closest button ancestor
  if (!button || !button.classList.contains(ACTION_BUTTON_CLASS)) { // Check class constant
      return; // Exit if not an action button
  }

  // Prevent clicks on disabled buttons
  if (button.disabled) {
      return;
  }

  debugLog(`Action button clicked: ${button.classList.toString()}`); // Log which button

  if (button.classList.contains(ACTION_TOGGLE_CLASS)) { // Use constant
    toggleSecret(button);
  } else if (button.classList.contains(ACTION_DELETE_CLASS)) { // Use constant
    removeRow(button); // This is async now, but handler itself isn't marked async
  } else if (button.classList.contains(ACTION_SAVE_CLASS)) { // Use constant
    saveField(button); // This is async now, but handler itself isn't marked async
  }
}

////////////////////////////////////////////////
// toggleSecret
////////////////////////////////////////////////
function toggleSecret(button) {
  try {
    const card = button.closest(`.${VARIABLE_CARD_CLASS}`); // Use constant
    if (!card) {
        debugLog("Could not find parent card for toggle button.", button, "warn");
        showToast("Error toggling visibility");
        return;
    }
    const valInput = card.querySelector(VALUE_INPUT_SELECTOR); // Use constant
    if (!valInput) {
         debugLog("Could not find value input in card.", card, "warn");
         showToast("Error toggling visibility");
         return;
    }
    // Now safe to use valInput
    const isPassword = valInput.type === 'password';
    valInput.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? '👁️ Hide' : '👁️ Show';
    debugLog(`Toggled visibility for key: ${card.dataset.originalKey || 'unknown'}`);
  } catch (err) {
    debugLog('Toggle error:', err, "error");
    showToast('Error toggling field visibility');
  }
}

////////////////////////////////////////////////
// removeRow
////////////////////////////////////////////////
async function removeRow(button) { // Make async
  const card = button.closest(`.${VARIABLE_CARD_CLASS}`); // Use constant
  if (!card) {
      debugLog("Remove failed: Could not find parent card.", button, "error");
      showToast("Error removing variable");
      return;
  }

  const rowData = getRowData(card);
  const keyToRemove = rowData ? rowData.key || rowData.originalKey : card.dataset.originalKey; // Try current key first, then original

  // Confirmation dialog
  if (!confirm(`Are you sure you want to remove the variable "${keyToRemove || 'this row'}"?`)) {
      debugLog("Variable removal cancelled by user.");
      return;
  }


  // Animate removal before interacting with storage
  card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
  card.style.opacity = '0';
  card.style.transform = 'translateX(-20px)';

  try {
      if (keyToRemove) { // Only interact with storage if we have a key
          debugLog(`Attempting to remove variable: ${keyToRemove}`);
          const storageResult = await getStorageData([STORAGE_KEY]);
          // Use structuredClone to avoid modifying the cached result directly
          const store = structuredClone(storageResult[STORAGE_KEY] || { [DEFAULT_ENV_SET_KEY]: {}, [DESCRIPTIONS_KEY]: {} });

          if (!store[DEFAULT_ENV_SET_KEY]) store[DEFAULT_ENV_SET_KEY] = {};
          if (!store[DESCRIPTIONS_KEY]) store[DESCRIPTIONS_KEY] = {};

          let removed = false;
          if (store[DEFAULT_ENV_SET_KEY].hasOwnProperty(keyToRemove)) {
              delete store[DEFAULT_ENV_SET_KEY][keyToRemove];
              removed = true;
          }
          if (store[DESCRIPTIONS_KEY].hasOwnProperty(keyToRemove)) {
              delete store[DESCRIPTIONS_KEY][keyToRemove];
              removed = true;
          }

          if (removed) {
              await setStorageData({ [STORAGE_KEY]: store });
              debugLog(`Successfully removed variable "${keyToRemove}" from storage.`);
          } else {
              debugLog(`Variable "${keyToRemove}" not found in storage for removal.`, null, "warn");
          }
      } else {
          debugLog("Removing row visually, but no key found to remove from storage.", null, "warn");
      }

      // Remove element after animation and storage operation (success or not found)
      setTimeout(() => {
           if(card && card.parentNode) { // Check if card still exists and has parent
              card.remove();
              debugLog("Removed row element from DOM.");
           }
      }, 300); // Match animation duration

      showToast(`Variable "${keyToRemove || 'Row'}" removed`);
      // No full reload needed, UI is updated. Could trigger selective state update.
      // await loadEnvVars();

  } catch (err) {
      console.error('Remove error:', err);
      debugLog('Remove error:', err, "error");
      showToast(`Error removing variable "${keyToRemove || ''}"`);
      // Restore card visibility if removal failed?
      card.style.opacity = '1';
      card.style.transform = 'translateX(0)';
  }
}
