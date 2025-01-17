console.log('Credentials Manager initializing...');

// Enhanced debug utilities
const DEBUG = true;
let debugEl;
let lastSelectedService = null; // Add this line

function debugLog(message, category = 'general', level = 'info') {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}][${category}][${level}] ${message}`;
    
    // Only add to debug UI, not console
    if (debugEl) {
        const line = document.createElement('div');
        line.className = `debug-line ${level}`;
        line.textContent = logMessage;
        debugEl.insertBefore(line, debugEl.firstChild);
        
        // Limit number of log entries to prevent memory issues
        if (debugEl.children.length > 100) {
            debugEl.lastChild.remove();
        }
    }
}

// Verify required scripts
function verifyRequiredScripts() {
    const requiredScripts = [
        '../scripts/credentials_helpers.js'
    ];
    
    const missingScripts = [];
    requiredScripts.forEach(script => {
        const scriptElement = document.querySelector(`script[src*="${script}"]`);
        if (!scriptElement) {
            missingScripts.push(script);
        }
    });
    
    if (missingScripts.length > 0) {
        debugLog(`Missing required scripts: ${missingScripts.join(', ')}`, 'scripts', 'error');
        return false;
    }
    debugLog('All required scripts verified', 'scripts', 'success');
    return true;
}


import {
  getAllCredentials,
  setCredential,
  removeCredential,
  getCredentialTimestamp  // Add this
} from '../scripts/credentials_helpers.js';

let currentFilesQueue = [];
let currentFileIndex = 0;
let lastKnownService = null; // Add this line

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status-messages') || createStatusContainer();
    const msgEl = document.createElement('div');
    msgEl.className = `status-message ${type}`;
    msgEl.textContent = message;
    statusDiv.prepend(msgEl);
    
    if (type !== 'error') {
        setTimeout(() => msgEl.remove(), 5000);
    }
    
    // Also log to debug area
    debugLog(message, 'status', type);
}

function createStatusContainer() {
    const container = document.createElement('div');
    container.id = 'status-messages';
    container.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        max-width: 300px;
        z-index: 10000;
    `;
    document.body.appendChild(container);
    return container;
}

// Consolidate UI setup into one function
async function setupUIHandlers() {
    debugLog('Setting up UI handlers...', 'init');
    
    const elements = {
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        btnAddClientSecret: document.getElementById('btnAddClientSecret'),
        btnAddToken: document.getElementById('btnAddToken'),
        btnAddCustom: document.getElementById('btnAddCustom'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalSaveBtn: document.getElementById('modalSaveBtn')
    };

    // Verify all elements exist
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            throw new Error(`Required UI element "${name}" not found`);
        }
    }

    // Setup drag and drop
    elements.dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        elements.dropZone.style.backgroundColor = '#e0e0e0';
        debugLog('Drag enter detected', 'drag');
    });

    elements.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.dropZone.style.backgroundColor = '';
        debugLog('Drag leave detected', 'drag');
    });

    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        debugLog('Drag over detected', 'drag');
    });

    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.style.backgroundColor = '';
        debugLog('Drop detected', 'drop');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        } else {
            debugLog('No files in drop event', 'drop', 'warn');
        }
    });

    // Setup file input
    elements.dropZone.addEventListener('click', () => {
        debugLog('Drop zone clicked', 'click');
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
        debugLog('File input change', 'input');
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Setup manual add buttons
    elements.btnAddClientSecret.addEventListener('click', () => {
        showModal({
            filename: 'new_client_secret.json',
            contents: { installed: {} },
            service: 'google-searchconsole',
            type: 'client_secret'
        });
    });

    elements.btnAddToken.addEventListener('click', () => {
        showModal({
            filename: 'new_token.json',
            contents: { token: {} },
            service: 'google-searchconsole',
            type: 'token'
        });
    });

    elements.btnAddCustom.addEventListener('click', () => {
        showModal({
            filename: 'new_custom.json',
            contents: {},
            service: 'custom',
            type: 'other'
        });
    });

    // Setup modal buttons
    elements.modalCancelBtn.addEventListener('click', () => {
        debugLog('Modal cancel clicked', 'modal');
        onModalCancel();
    });

    elements.modalSaveBtn.addEventListener('click', () => {
        debugLog('Modal save clicked', 'modal');
        onModalSave();
    });

    debugLog('UI handlers setup complete', 'init', 'success');
    return true;
}

// Fix initialization sequence
async function initCredsManager() {
    debugLog('Starting initialization...', 'init');
    
    // Initialize debug element
    debugEl = document.getElementById('debugLogs');
    if (!debugEl) {
        console.error('Debug logs container not found!');
        return;
    }

    try {

        // Test storage access
        debugLog('Testing storage access...', 'storage');
        const testCreds = await getAllCredentials();
        debugLog(`Storage access successful, found ${Object.keys(testCreds).length} services`, 'storage', 'success');

        // Setup UI
        const setupSuccess = await setupUIHandlers();
        if (!setupSuccess) {
            throw new Error('UI setup failed');
        }

        // Load credentials
        await renderAllCredentials();
        debugLog('Initialization complete', 'init', 'success');
        // Removed showStatus call here

    } catch (err) {
        debugLog(`Initialization error: ${err.message}`, 'init', 'error');
        showStatus(`Initialization error: ${err.message}`, 'error');
        throw err;
    }
}

// Single initialization point
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('DOM loaded, beginning initialization sequence...', 'init');
    try {
        await initCredsManager();
    } catch (err) {
        debugLog(`Critical initialization error: ${err.message}`, 'init', 'error');
        showStatus('Failed to initialize - check console', 'error');
    }
});

function handleDrop(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files) {
    handleFiles(e.dataTransfer.files);
  }
}

// Enhanced file handling with detailed debugging
async function handleFiles(fileList) {
    debugLog(`Processing ${fileList.length} files...`, 'files');
    
    if (!fileList || fileList.length === 0) {
        showStatus('No files selected', 'warn');
        return;
    }

    const filesArray = Array.from(fileList);

    currentFilesQueue = [];

    for (const file of filesArray) {
        debugLog(`Processing file: ${file.name} (${file.size} bytes)`, 'files');
        if (file.size > 2 * 1024 * 1024) {
            debugLog(`File "${file.name}" too large (>2MB). Skipping.`, 'files', 'warn');
            continue;
        }
        let json;
        try {
            const text = await file.text();
            json = JSON.parse(text);
        } catch (err) {
            debugLog(`Error parsing "${file.name}": ${err}`, 'files', 'error');
            continue;
        }

        const serviceGuess = detectService(file.name, json);
        const typeGuess = detectType(json);

        // If we can't guess the service but have a previous non-custom service, use it
        const service = serviceGuess || (lastSelectedService || 'custom');
        
        currentFilesQueue.push({
            filename: file.name,
            contents: json,
            service,
            type: typeGuess || 'other'
        });

        // Store last known good service if it's not custom
        if (serviceGuess && serviceGuess !== 'custom') {
            lastKnownService = serviceGuess;
        }
    }

    if (currentFilesQueue.length > 0) {
        currentFileIndex = 0;
        showModal(currentFilesQueue[0]);
    }
}

/**
 * Attempt to detect the service by looking at known fields
 * in the JSON content (preferred), then fallback to filename-based detection.
 */
function detectService(filename, json) {
  try {
    // 1) Check for common OAuth credential structures ("installed" or "web")
    //    and see if any known service scopes are present.
    const possibleClientObj = json.installed || json.web || {};
    
    // Consolidate scopes from either a 'scope' string or 'scopes' array in the token/client
    const allScopes = extractScopes(possibleClientObj, json);

    // Content-based inference of Google services from scope
    if (allScopes.some(s => s.includes('webmasters'))) {
      return 'google-searchconsole';
    }
    if (allScopes.some(s => s.includes('analytics'))) {
      return 'google-analytics';
    }
    if (allScopes.some(s => s.includes('drive'))) {
      return 'google-drive';
    }
    if (allScopes.some(s => s.includes('spreadsheets'))) {
      return 'google-sheets';
    }

    // 2) If not found by scope, do your original filename-based detection as a fallback:
    const lower = filename.toLowerCase();
    if (lower.includes('searchconsole')) return 'google-searchconsole';
    if (lower.includes('analytics')) return 'google-analytics';
    if (lower.includes('drive')) return 'google-drive';
    if (lower.includes('sheets')) return 'google-sheets';

    // 3) If still no match, return null so the user can pick manually
    return null;
  } catch (err) {
    // If anything goes wrong, fallback to null
    return null;
  }
}

/**
 * Attempt to detect type by looking for typical OAuth token fields vs. client_secret fields.
 */
function detectType(json) {
  // If it looks like a client secret (OAuth "installed" or "web" object)
  if (json.installed || json.web) {
    return 'client_secret';
  }

  // If it looks like a token file (contains access_token/refresh_token/scopes, etc.)
  if (json.token || json.access_token || json.refresh_token) {
    return 'token';
  }

  // Otherwise, default to "other"
  return 'other';
}

/**
 * A small helper to extract scopes from JSON content,
 * checking both token-like and client_secret-like structures.
 */
function extractScopes(clientObj, rawJson) {
  const result = [];

  // If there's a 'scope' string, split on spaces
  if (typeof clientObj.scope === 'string') {
    result.push(...clientObj.scope.split(/\s+/));
  }
  if (typeof rawJson.scope === 'string') {
    result.push(...rawJson.scope.split(/\s+/));
  }

  // If there's a 'scopes' array
  if (Array.isArray(clientObj.scopes)) {
    result.push(...clientObj.scopes);
  }
  if (Array.isArray(rawJson.scopes)) {
    result.push(...rawJson.scopes);
  }

  // Some tokens store scope under root keys
  if (typeof rawJson.token === 'object' && typeof rawJson.token.scope === 'string') {
    result.push(...rawJson.token.scope.split(/\s+/));
  }

  // Return unique non-empty scope strings, all lowercased
  return [...new Set(result.map(s => s.toLowerCase()).filter(Boolean))];
}


// Modal
async function showModal(fileObj) {  // Make this function async
    debugLog(`Showing modal for: ${fileObj.filename || 'manual entry'}`, 'modal');
    
    const modal = document.getElementById('modalOverlay');
    if (!modal) {
        debugLog('Modal element not found!', 'modal', 'error');
        return;
    }

    try {
        document.getElementById('modalTitle').textContent = fileObj.filename
            ? `Assign Service/Type: ${fileObj.filename}`
            : 'Add Credential Manually';

        const serviceSelect = document.getElementById('serviceSelect');
        const customInput = document.getElementById('customServiceInput');
        const existingServicesHint = document.getElementById('existingServicesHint');
        const existingServicesList = document.getElementById('existingServicesList');

        // Remove existing event listeners by cloning and replacing
        const newServiceSelect = serviceSelect.cloneNode(true);
        serviceSelect.parentNode.replaceChild(newServiceSelect, serviceSelect);

        // Set initial values
        newServiceSelect.value = fileObj.service;
        document.getElementById('typeSelect').value = fileObj.type;
        document.getElementById('manualJsonInput').value = 
            typeof fileObj.contents === 'object' 
                ? JSON.stringify(fileObj.contents, null, 2)
                : '{}';

        // Handle service selection changes
        const handleServiceChange = async () => {
            const isCustom = newServiceSelect.value === 'custom';
            customInput.style.display = isCustom ? 'block' : 'none';
            existingServicesHint.style.display = isCustom ? 'block' : 'none';
            
            if (isCustom) {
                const customServices = await getExistingCustomServices();
                if (customServices.length > 0) {
                    existingServicesList.textContent = customServices.join(', ');
                    existingServicesList.onclick = (e) => {
                        const service = e.target.textContent;
                        customInput.value = service;
                    };
                } else {
                    existingServicesHint.style.display = 'none';
                }
            }
        };

        newServiceSelect.addEventListener('change', handleServiceChange);

        // Initial state
        const isCustom = newServiceSelect.value === 'custom';
        customInput.style.display = isCustom ? 'block' : 'none';
        existingServicesHint.style.display = isCustom ? 'block' : 'none';
        if (isCustom) {
            customInput.value = fileObj.service || '';
            const customServices = await getExistingCustomServices();
            if (customServices.length > 0) {
                existingServicesList.textContent = customServices.join(', ');
            }
        }

        modal.style.display = 'flex';
        debugLog('Modal displayed successfully', 'modal');
    } catch (err) {
        debugLog(`Error showing modal: ${err.message}`, 'modal', 'error');
    }
}

function onModalCancel() {
  document.getElementById('modalOverlay').style.display = 'none';

  if (currentFileIndex < currentFilesQueue.length - 1) {
    currentFileIndex++;
    showModal(currentFilesQueue[currentFileIndex]);
  } else {
    currentFilesQueue = [];
    currentFileIndex = 0;
  }
}

// Enhanced error handling for credential operations
async function onModalSave() {
    debugLog('Starting credential save...', 'save');
    try {
        showStatus('Saving credential...');
        let service = document.getElementById('serviceSelect').value;
        
        // Store the selected service if it's not custom
        if (service !== 'custom') {
            lastSelectedService = service;
        }
        
        const type = document.getElementById('typeSelect').value;
        const rawJson = document.getElementById('manualJsonInput').value;

        let parsed;
        try {
            parsed = JSON.parse(rawJson);
        } catch (err) {
            debugLog(`Invalid JSON: ${err}`, 'save', 'error');
            return;
        }

        const customInput = document.getElementById('customServiceInput');
        
        if (service === 'custom') {
            service = customInput.value.trim();
            if (!service) {
                debugLog('Custom service name required', 'save', 'error');
                showStatus('Please enter a custom service name', 'error');
                return;
            }
        }

        let filename = '';
        if (currentFilesQueue[currentFileIndex] && currentFilesQueue[currentFileIndex].filename) {
            filename = currentFilesQueue[currentFileIndex].filename;
            if (!filename.endsWith('.json')) {
                filename += '.json';
            }
        } else {
            filename = `${service}_${type}.json`;
        }

        const credObj = {
            id: 'cred_' + Date.now(),
            filename,
            contents: parsed
        };

        try {
            await setCredential(service, type, credObj);
            debugLog(`Saved credential => ${service}/${type}`, 'save', 'success');
            renderAllCredentials();
        } catch (err) {
            debugLog(`Error saving credential => ${service}/${type}: ${err}`, 'save', 'error');
        }

        document.getElementById('modalOverlay').style.display = 'none';

        if (currentFileIndex < currentFilesQueue.length - 1) {
            currentFileIndex++;
            showModal(currentFilesQueue[currentFileIndex]);
        } else {
            currentFilesQueue = [];
            currentFileIndex = 0;
        }
        showStatus('Credential saved successfully!');
    } catch (err) {
        debugLog(`Save error: ${err.message}`, 'save', 'error');
        showStatus(`Save failed: ${err.message}`, 'error');
    }
}

// Fix the renderAllCredentials function
async function renderAllCredentials() {
    debugLog('Starting credential rendering...', 'render');
    const container = document.getElementById('credsList');
    if (!container) {
        debugLog('Credentials list container not found!', 'render', 'error');
        return;
    }

    try {
        const creds = await getAllCredentials();
        container.innerHTML = ''; // Clear existing

        if (Object.keys(creds).length === 0) {
            container.innerHTML = '<p>No credentials stored</p>';
            debugLog('No credentials to render', 'render');
            return;
        }

        for (const [service, types] of Object.entries(creds)) {
            const serviceDiv = document.createElement('div');
            serviceDiv.className = 'service-group';
            serviceDiv.innerHTML = `<h3>${service}</h3>`;

            for (let [storageType, cred] of Object.entries(types)) {
                // Remove .json from type for display
                const displayType = storageType.replace(/\.json$/, '');
                
                const credDiv = document.createElement('div');
                credDiv.className = 'credential-content';

                // Main credential info
                const mainInfo = document.createElement('div');
                mainInfo.className = 'cred-main';
                
                const credInfo = document.createElement('span');
                credInfo.innerHTML = `<strong>${displayType}:</strong> ${cred.filename}`;
                mainInfo.appendChild(credInfo);

                // Add timestamp display
                const timestamp = document.createElement('span');
                timestamp.className = 'timestamp';
                timestamp.innerHTML = await getTimestampDisplay(service, storageType, cred);
                mainInfo.appendChild(timestamp);

                // Add view/edit button
                const viewButton = document.createElement('button');
                viewButton.className = 'view-btn';
                viewButton.textContent = 'View/Edit';
                viewButton.addEventListener('click', () => {
                    showViewEditModal(service, storageType, cred);
                });
                mainInfo.appendChild(viewButton);

                // Remove button using storage type
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-btn';
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to remove ${service}/${displayType}?`)) {
                        try {
                            // First try to remove with .json extension
                            const resultJson = await removeCredential(service, displayType);
                            // If that fails, try without extension (backward compatibility)
                            const resultLegacy = resultJson || await removeCredential(service, storageType);
                            
                            if (resultJson || resultLegacy) {
                                await renderAllCredentials();
                                showStatus(`Removed ${service}/${displayType} credential`, 'success');
                            }
                        } catch (err) {
                            showStatus(`Failed to remove credential: ${err.message}`, 'error');
                        }
                    }
                });
                mainInfo.appendChild(removeButton);

                // Storage key info - show actual storage key including .json
                const storageKey = `superAuthCreds.${service}.${storageType}`;
                const storageInfo = document.createElement('div');
                storageInfo.className = 'storage-info';
                storageInfo.innerHTML = `
                    <span class="storage-key">
                        🔑 ${storageKey}
                    </span>`;
                
                storageInfo.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(storageKey);
                        showStatus('Storage key copied to clipboard!', 'success');
                    } catch (err) {
                        showStatus('Failed to copy storage key', 'error');
                    }
                });

                credDiv.appendChild(mainInfo);
                credDiv.appendChild(storageInfo);
                serviceDiv.appendChild(credDiv);
            }

            container.appendChild(serviceDiv);
        }
        debugLog(`Rendered ${Object.keys(creds).length} services`, 'render', 'success');
    } catch (err) {
        debugLog(`Render error: ${err.message}`, 'render', 'error');
        container.innerHTML = '<p class="error">Error loading credentials</p>';
    }
}

// Add global error handler
window.addEventListener('error', (event) => {
    debugLog(`Global error: ${event.message}`, 'error', 'error');
});

// Add function to get unique existing custom services
async function getExistingCustomServices() {
    try {
        const creds = await getAllCredentials();
        return Object.keys(creds).filter(service => 
            !['google-searchconsole', 'google-analytics', 'google-drive', 'google-sheets']
            .includes(service)
        );
    } catch (err) {
        debugLog(`Error getting existing services: ${err}`, 'services', 'error');
        return [];
    }
}

// Add function to select custom service
window.selectCustomService = (service) => {
    const customInput = document.getElementById('customServiceInput');
    if (customInput) {
        customInput.value = service;
    }
};

// Add this after other imports
function formatDate(timestamp) {
    if (!timestamp) return 'No date';
    return new Date(timestamp).toLocaleString();
}

// Add new functions for viewing/editing credentials
function showViewEditModal(service, type, cred) {
    const modal = document.getElementById('viewEditModal');
    const title = document.getElementById('viewEditModalTitle');
    const content = document.getElementById('viewEditModalContent');
    const closeBtn = document.getElementById('viewEditModalClose');
    const saveBtn = document.getElementById('viewEditModalSave');
    const cancelBtn = document.getElementById('viewEditModalCancel');
    
    if (!modal || !title || !content || !closeBtn || !saveBtn || !cancelBtn) {
        debugLog('View/Edit modal elements not found!', 'modal', 'error');
        showStatus('UI Error: Missing modal elements', 'error');
        return;
    }

    // Setup close handlers
    const closeModal = () => {
        modal.style.display = 'none';
        document.removeEventListener('keydown', handleEscape);
    };

    const handleEscape = (e) => {
        if (e.key === 'Escape') closeModal();
    };

    // Close on escape key
    document.addEventListener('keydown', handleEscape);

    // Close on clicking close button or cancel
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    // Close on clicking outside modal
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Prevent closing when clicking modal content
    content.onclick = (e) => e.stopPropagation();

    title.textContent = `${service}/${type}`;
    
    const modalBody = content.querySelector('.modal-body');
    if (!modalBody) {
        debugLog('Modal body element not found!', 'modal', 'error');
        showStatus('UI Error: Missing modal body', 'error');
        return;
    }

    modalBody.innerHTML = `
        <div class="form-group">
            <label>Content:</label>
            <textarea id="editJsonContent" spellcheck="false">${JSON.stringify(cred.contents, null, 2)}</textarea>
        </div>
        <div class="timestamp-info">
            ${cred.contents.last_updated ? 
                `Last Updated: ${formatDate(cred.contents.last_updated)}` : 
                `Created: ${formatDate(cred.contents.created_at || Date.now())}`}
        </div>`;

    // Setup save handler
    saveBtn.onclick = async () => {
        try {
            const textarea = document.getElementById('editJsonContent');
            if (!textarea) {
                throw new Error('Could not find edit content textarea');
            }

            const newContent = JSON.parse(textarea.value);
            
            // Add/update timestamps
            newContent.last_updated = Date.now();
            if (!newContent.created_at) {
                newContent.created_at = cred.contents.created_at || Date.now();
            }

            await setCredential(service, type, {
                ...cred,
                contents: newContent
            });
            
            closeModal();
            showStatus('Credential updated successfully!', 'success');
            await renderAllCredentials();

        } catch (err) {
            showStatus(`Failed to update: ${err.message}`, 'error');
            debugLog(`Save error: ${err.message}`, 'modal', 'error');
        }
    };

    modal.style.display = 'flex';
}

// Update the timestamp display function to be backward compatible
async function getTimestampDisplay(service, storageType, cred) {
    // Try to get timestamp from separate storage first
    const timestamp = await getCredentialTimestamp(service, storageType);
    
    if (timestamp) {
        return `<span class="timestamp" title="Last Updated">
            🕒 ${formatDate(timestamp.last_updated)}
            ${timestamp.created_at ? `<br><small>Created: ${formatDate(timestamp.created_at)}</small>` : ''}
        </span>`;
    }
    
    // Fallback to legacy timestamp in credential contents
    if (cred.contents.last_updated || cred.contents.created_at) {
        return `<span class="timestamp" title="Last Updated">
            🕒 ${formatDate(cred.contents.last_updated || cred.contents.created_at)}
        </span>`;
    }
    
    return '<span class="timestamp" title="No timestamp">⏱️ Unknown</span>';
}

// No CSS changes needed as styles are managed via superpowers.css
