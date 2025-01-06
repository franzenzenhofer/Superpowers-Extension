// sidepanel.js
// Minimal logic to read/write environment variables in chrome.storage,
// displayed in side panel, plus a debug message listener.

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadEnvVars();
  document.getElementById("addRowBtn").addEventListener("click", () => addRow());
  document.getElementById("saveBtn").addEventListener("click", saveEnvVars);

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
  chrome.storage.local.get(["superEnvVars"], (data) => {
    const envVars = data.superEnvVars || {};
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

  chrome.storage.local.set({ superEnvVars: newEnv }, () => {
    alert("Environment variables saved!");
  });
}
