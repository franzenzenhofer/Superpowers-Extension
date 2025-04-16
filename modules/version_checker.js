console.debug("[Version Checker] Module loading...");

const VERSION_CONFIG = {
  GITHUB_VERSION_URL: "https://raw.githubusercontent.com/franzenzenhofer/Superpowers-Extension/main/manifest.json",
  GITHUB_REPO_URL: "https://github.com/franzenzenhofer/Superpowers-Extension",
  hasCheckedVersion: false,
  hasNotifiedUpdate: false,
  lastNotifiedVersion: null
};

// Add cache breaker function
function getCacheBreakerUrl(url) {
  return `${url}?cb=${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Checks if an update notice is already showing in the sidepanel
 */
async function isUpdateNoticeShowing() {
  try {
    // Add a small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check all possible locations for update notice
    const windows = await chrome.windows.getAll({ populate: true });
    for (const window of windows) {
      for (const tab of window.tabs) {
        // Only check active tabs and sidepanel
        if (!tab.url?.includes('sidepanel.html') && !tab.active) continue;
        
        try {
          const [results] = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => document.querySelectorAll('.update-notice').length > 0
          });
          
          if (results?.result) {
            console.debug("[Version Check] Update notice found");
            return true;
          }
        } catch (err) {
          console.debug("[Version Check] Couldn't check tab:", err);
        }
      }
    }
    return false;
  } catch (err) {
    console.debug("[Version Check] Error checking for update notice:", err);
    return false;
  }
}

/**
 * Core version check logic used by all check variants
 */
async function checkVersionCore(mode = 'regular') {
  try {
    const versionUrl = getCacheBreakerUrl(VERSION_CONFIG.GITHUB_VERSION_URL);
    console.debug(`[Version Check] Checking URL (${mode}):`, versionUrl);
    const response = await fetch(versionUrl);
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    console.debug(`[Version Check] ${mode} check - Current: ${currentVersion}, Latest: ${remoteManifest.version}`);

    if (remoteManifest.version > currentVersion) {
      const noticeExists = await isUpdateNoticeShowing();
      if (!noticeExists && await shouldNotifyUpdate(remoteManifest.version)) {
        console.debug(`[Version Check] Update available (${mode})`);
        // Send appropriate notification based on mode
        if (mode === 'sidepanel') {
          chrome.runtime.sendMessage({
            type: "SIDEPANEL_VERSION_UPDATE",
            currentVersion,
            latestVersion: remoteManifest.version,
            updateUrl: VERSION_CONFIG.GITHUB_REPO_URL,
            timestamp: Date.now()
          });
        } else {
          chrome.runtime.sendMessage({
            type: "VERSION_CHECK",
            currentVersion,
            latestVersion: remoteManifest.version,
            updateUrl: VERSION_CONFIG.GITHUB_REPO_URL,
            timestamp: Date.now()
          });
        }
      } else {
        console.debug(`[Version Check] Update notice already showing or notified (${mode})`);
      }
    } else {
      console.debug(`[Version Check] Version is current (${mode})`);
    }
  } catch (err) {
    console.debug(`[Version Check] ${mode} check failed:`, err);
  }
}

/**
 * Checks if we should notify about an update
 */
async function shouldNotifyUpdate(latestVersion) {
  if (VERSION_CONFIG.hasNotifiedUpdate && VERSION_CONFIG.lastNotifiedVersion === latestVersion) {
    console.debug("[Version Check] Already notified about version", latestVersion);
    return false;
  }
  VERSION_CONFIG.hasNotifiedUpdate = true;
  VERSION_CONFIG.lastNotifiedVersion = latestVersion;
  return true;
}

/**
 * Regular version check
 */
export async function checkVersion() {
  console.debug("[Version Check] Starting regular version check...");
  if (VERSION_CONFIG.hasCheckedVersion) {
    console.debug("[Version Check] Already checked this session, skipping");
    return;
  }
  VERSION_CONFIG.hasCheckedVersion = true;
  await checkVersionCore('regular');
}

/**
 * Quiet version check
 */
export async function checkVersionQuiet() {
  console.debug("[Version Check] Starting quiet version check...");
  await checkVersionCore('quiet');
}

/**
 * Sidepanel version check
 */
export async function checkVersionSidepanel() {
  console.debug("[Version Check] Starting sidepanel version check...");
  await checkVersionCore('sidepanel');
}

/**
 * Sets up version checking listeners
 */
export async function initializeVersionChecker() {
  console.debug("[Version Checker] Initializing...");
  
  // Perform immediate first check
  await checkVersion().catch(err => console.debug("[Version Check] Initial check failed:", err));
  
  // Check on startup
  chrome.runtime.onStartup.addListener(() => {
    console.debug("[Version Checker] Startup check triggered");
    checkVersion();
  });
  
  // Check on install/update
  chrome.runtime.onInstalled.addListener((details) => {
    console.debug('[Version Checker] Extension event:', details.reason);
    checkVersion();
  });

  // Add exported quiet check for sidepanel usage
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CHECK_VERSION_QUIET") {
      checkVersionQuiet(); // Non-blocking, no response needed
      sendResponse({ success: true });
      return false;
    }
  });

  console.debug("[Version Checker] Initialization complete");
  return true;
}
