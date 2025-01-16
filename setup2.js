#!/usr/bin/env node
/**
 * setup.js (QA Release) - Creates 3 new credential files in the correct places.
 *
 *   1) scripts/credentials_helpers.js
 *   2) pages/credentials_manager.html
 *   3) pages/credentials_manager.js
 *
 * The script checks if a file already exists. If so, it SKIPS creation (no overwrite).
 * It logs each step to let you know what’s happening.
 *
 * Usage (from project root):
 *    node setup.js
 *
 * No external dependencies needed. If you see "Skipping" in logs,
 * it means that file already exists, so we do not overwrite it.
 */

const fs = require('fs');
const path = require('path');

/** 
 * The code we will create in each file.
 * We produce them in an array so we can easily loop and create them.
 */
const FILES_TO_CREATE = [
  {
    filename: 'credentials_helpers.js',
    targetDir: 'scripts',
    contents: `
// credentials_helpers.js
// Single credential per (service, type). Overwrites old credential if set again.
//
// Provides a minimal wrapper over chrome.storage.local for "superAuthCreds".

const STORE_KEY = 'superAuthCreds';

/**
 * Return ALL stored credentials (object):
 *   {
 *     "google-searchconsole": {
 *       "client_secret": { id, filename, contents },
 *       "token": { id, filename, contents }
 *     },
 *     "google-analytics": { ... },
 *     ...
 *   }
 */
export async function getAllCredentials() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORE_KEY], (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(res[STORE_KEY] || {});
    });
  });
}

/**
 * Return the single credential object for (service, type), or null if not found:
 *   { id, filename, contents }
 */
export async function getCredential(service, type) {
  const all = await getAllCredentials();
  if (!all[service] || !all[service][type]) return null;
  return all[service][type];
}

/**
 * Set (or overwrite) the credential for (service, type). The credential must be:
 *   {
 *     id: string,
 *     filename: string,
 *     contents: object
 *   }
 */
export async function setCredential(service, type, credObj) {
  return new Promise(async (resolve, reject) => {
    let all;
    try {
      all = await getAllCredentials();
    } catch (err) {
      return reject(err);
    }
    if (!all[service]) all[service] = {};
    all[service][type] = credObj;

    chrome.storage.local.set({ [STORE_KEY]: all }, () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(true);
    });
  });
}

/**
 * Remove the single credential for (service, type).
 * Returns true if it was removed, false if not present.
 */
export async function removeCredential(service, type) {
  return new Promise(async (resolve, reject) => {
    let all;
    try {
      all = await getAllCredentials();
    } catch (err) {
      return reject(err);
    }
    if (!all[service] || !all[service][type]) {
      return resolve(false);
    }
    delete all[service][type];
    if (!Object.keys(all[service]).length) {
      delete all[service];
    }
    chrome.storage.local.set({ [STORE_KEY]: all }, () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(true);
    });
  });
}

// Optional fallback for non-module usage
if (typeof window !== 'undefined' && !window.CredentialHelpers) {
  window.CredentialHelpers = {
    getAllCredentials,
    getCredential,
    setCredential,
    removeCredential
  };
}
`
  },

  {
    filename: 'credentials_manager.html',
    targetDir: 'pages',
    contents: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="superpowers" content="enabled" />
  <title>Credentials Manager</title>
</head>
<body style="margin:20px; font-family:sans-serif;">
  <h1>Credentials Manager</h1>
  <div id="dropZone" style="
      border:2px dashed #888;
      padding: 20px;
      text-align:center;
      margin-bottom:10px;
      cursor:pointer;
    ">
    <p>Drag &amp; drop JSON files here<br>(or click to browse)</p>
  </div>
  <input type="file" id="fileInput" style="display:none" multiple accept=".json" />

  <h2>Current Credentials</h2>
  <div id="credsList" style="
      border:1px solid #ccc;
      padding:10px;
      min-height:30px;
      margin-bottom:10px;
    ">
    <!-- dynamically rendered credentials -->
  </div>

  <h2>Logs</h2>
  <div id="debugLogs"
       style="
         background:#f5f5f5;
         color:#333;
         padding:10px;
         border:1px solid #ccc;
         max-height:200px;
         overflow-y:auto;
       ">
  </div>

  <script type="module" src="credentials_manager.js"></script>
</body>
</html>
`
  },

  {
    filename: 'credentials_manager.js',
    targetDir: 'pages',
    contents: `import {
  getAllCredentials,
  getCredential,
  setCredential,
  removeCredential
} from '../scripts/credentials_helpers.js';

document.addEventListener('DOMContentLoaded', initCredsManager);

function initCredsManager() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  dropZone.addEventListener('dragover', (e) => e.preventDefault());
  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  logDebug("Credentials Manager loaded. Ready for JSON file drag/drop.");
  renderAllCredentials();
}

function handleDrop(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files) {
    handleFiles(e.dataTransfer.files);
  }
}

async function handleFiles(fileList) {
  for (const file of fileList) {
    if (file.size > 2 * 1024 * 1024) {
      logDebug(\`File "\${file.name}" too large (>2MB). Skipping.\`, 'warn');
      continue;
    }
    try {
      const text = await file.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (err) {
        logDebug(\`JSON parse error on "\${file.name}": \${err}\`, 'error');
        continue;
      }

      // Basic detection for "token" or "client_secret" plus "google-searchconsole" or "google-analytics"
      let service = detectService(file.name, json);
      let type = detectType(file.name, json);

      if (!service || !type) {
        const fallback = prompt(\`Unrecognized file "\${file.name}". Provide "service,type" (e.g. "google-searchconsole,token"):\`);
        if (!fallback) {
          logDebug(\`Skipping "\${file.name}" (no user input)\`, 'warn');
          continue;
        }
        const [svc, typ] = fallback.split(',').map(s => s.trim());
        service = svc || 'unknown-service';
        type = typ || 'unknown-type';
      }

      const credObj = {
        id: 'cred_' + Date.now(),
        filename: file.name,
        contents: json
      };
      await setCredential(service, type, credObj);
      logDebug(\`Set credential => \${service}/\${type} (overwrites old)\`, 'info');
      await renderAllCredentials();
    } catch (err) {
      logDebug(\`Error processing file "\${file.name}": \${err}\`, 'error');
    }
  }
}

function detectService(filename, json) {
  const lower = filename.toLowerCase();
  if (lower.includes('searchconsole')) return 'google-searchconsole';
  if (lower.includes('analytics')) return 'google-analytics';
  // Could add more detection...
  return null;
}
function detectType(filename, json) {
  if (json.installed || json.web) return 'client_secret';
  if (json.token || json.access_token || json.refresh_token) return 'token';
  return null;
}

async function renderAllCredentials() {
  const container = document.getElementById('credsList');
  container.innerHTML = '';

  let all = {};
  try {
    all = await getAllCredentials();
  } catch (err) {
    logDebug(\`Error fetching credentials: \${err}\`, 'error');
  }

  const services = Object.keys(all);
  if (!services.length) {
    container.textContent = 'No credentials stored.';
    return;
  }

  for (const svc of services) {
    const svcObj = all[svc];
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Service: ' + svc;
    titleEl.style.fontWeight = 'bold';
    titleEl.style.marginTop = '8px';
    container.appendChild(titleEl);

    for (const type in svcObj) {
      const row = document.createElement('div');
      row.style.marginLeft = '16px';
      row.style.marginBottom = '4px';
      row.textContent = \`Type: \${type} | File: \${svcObj[type].filename}\`;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.style.marginLeft = '8px';
      removeBtn.onclick = async () => {
        await removeCredential(svc, type);
        logDebug(\`Removed \${svc}/\${type}\`, 'info');
        renderAllCredentials();
      };
      row.appendChild(removeBtn);

      container.appendChild(row);
    }
  }
}

function logDebug(msg, level='info') {
  const debugEl = document.getElementById('debugLogs');
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = \`[\${time}][\${level}] \${msg}\`;
  debugEl.appendChild(line);

  // If you want to also pass it on:
  if (window.Superpowers?.debugLog) {
    window.Superpowers.debugLog(msg, level, 'credentials_manager.js');
  }
}
`
  }
];

// ---------------------------------------------------------------------------
// Main function to create the files
// ---------------------------------------------------------------------------
(function main() {
  console.log("\n[setup.js] (QA Release) Starting credentials setup...");

  FILES_TO_CREATE.forEach(spec => {
    const { filename, targetDir, contents } = spec;
    const dirPath = path.join(process.cwd(), targetDir);
    const filePath = path.join(dirPath, filename);

    // 1) Ensure directory
    if (!fs.existsSync(dirPath)) {
      console.log(`[setup.js] Creating directory => ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 2) If file exists, skip
    if (fs.existsSync(filePath)) {
      console.log(`[setup.js] SKIPPING (already exists): ${filePath}`);
      return;
    }

    // 3) Write the new file
    fs.writeFileSync(filePath, contents.trimStart() + '\n', 'utf8');
    console.log(`[setup.js] Created => ${filePath}`);
  });

  console.log("[setup.js] Done! Created missing credential files. All set.\n");
})();
