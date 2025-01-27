const VERSION_CONFIG = {
  GITHUB_VERSION_URL: "https://raw.githubusercontent.com/franzenzenhofer/Superpowers-Extension/main/manifest.json",
  GITHUB_REPO_URL: "https://github.com/franzenzenhofer/Superpowers-Extension",
  hasCheckedVersion: false
};

/**
 * Checks the current version against the GitHub version
 */
export async function checkVersion() {
  if (VERSION_CONFIG.hasCheckedVersion) return;
  VERSION_CONFIG.hasCheckedVersion = true;
  
  try {
    const response = await fetch(VERSION_CONFIG.GITHUB_VERSION_URL);
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    if (remoteManifest.version > currentVersion) {
      // Notify sidepanel about update
      notifyUpdate(currentVersion, remoteManifest.version);
      
      // Open GitHub on first detection
      chrome.tabs.create({ url: VERSION_CONFIG.GITHUB_REPO_URL });
    }
  } catch (err) {
    console.debug("[Version Check] Failed:", err);
  }
}

/**
 * Notifies the sidepanel about available updates
 */
function notifyUpdate(currentVersion, latestVersion) {
  chrome.runtime.sendMessage({
    type: "VERSION_CHECK",
    currentVersion,
    latestVersion,
    updateUrl: VERSION_CONFIG.GITHUB_REPO_URL
  });
}

/**
 * Sets up version checking listeners
 */
export function initializeVersionChecker() {
  // Check on startup
  chrome.runtime.onStartup.addListener(checkVersion);
  
  // Check on install/update
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Version Checker] Extension event:', details.reason);
    checkVersion();
  });
}
