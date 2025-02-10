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
    // Use modern chrome.windows.getAll API
    const windows = await chrome.windows.getAll({ populate: true });
    for (const window of windows) {
      for (const tab of window.tabs) {
        if (tab.url?.includes('sidepanel.html')) {
          // Check main frame
          const [mainResults] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => !!document.querySelector('.update-notice')
          });
          
          if (mainResults?.result) {
            console.debug("[Version Check] Update notice found in main frame");
            return true;
          }

          // Check all frames
          const [frameResults] = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => !!document.querySelector('.update-notice')
          });
          
          if (frameResults?.result) {
            console.debug("[Version Check] Update notice found in frame");
            return true;
          }
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
 * Checks if we should notify about an update
 */
function shouldNotifyUpdate(latestVersion) {
  if (VERSION_CONFIG.hasNotifiedUpdate && VERSION_CONFIG.lastNotifiedVersion === latestVersion) {
    console.debug("[Version Check] Already notified about version", latestVersion);
    return false;
  }
  VERSION_CONFIG.hasNotifiedUpdate = true;
  VERSION_CONFIG.lastNotifiedVersion = latestVersion;
  return true;
}

/**
 * Checks the current version against the GitHub version
 */
export async function checkVersion() {
  console.debug("[Version Check] Starting regular version check...");
  if (VERSION_CONFIG.hasCheckedVersion) {
    console.debug("[Version Check] Already checked this session, skipping");
    return;
  }
  VERSION_CONFIG.hasCheckedVersion = true;
  
  try {
    const versionUrl = getCacheBreakerUrl(VERSION_CONFIG.GITHUB_VERSION_URL);
    console.debug("[Version Check] Checking URL:", versionUrl);
    const response = await fetch(versionUrl);
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    console.debug(`[Version Check] Current: ${currentVersion}, Latest: ${remoteManifest.version}`);

    if (remoteManifest.version > currentVersion) {
      const noticeExists = await isUpdateNoticeShowing();
      if (!noticeExists && shouldNotifyUpdate(remoteManifest.version)) {
        console.debug("[Version Check] Update available, notifying user");
        notifyUpdate(currentVersion, remoteManifest.version);
        chrome.tabs.create({ url: VERSION_CONFIG.GITHUB_REPO_URL });
      } else {
        console.debug("[Version Check] Update notice already showing or already notified");
      }
    } else {
      console.debug("[Version Check] Version is current");
    }
  } catch (err) {
    console.debug("[Version Check] Failed:", err);
  }
}

/**
 * Checks version without showing notifications if up to date
 * Only notifies if update is available
 */
export async function checkVersionQuiet() {
  console.debug("[Version Check] Starting quiet version check...");
  try {
    const versionUrl = getCacheBreakerUrl(VERSION_CONFIG.GITHUB_VERSION_URL);
    console.debug("[Version Check] Checking URL:", versionUrl);
    const response = await fetch(versionUrl);
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    console.debug(`[Version Check] Quiet check - Current: ${currentVersion}, Latest: ${remoteManifest.version}`);

    if (remoteManifest.version > currentVersion) {
      const noticeExists = await isUpdateNoticeShowing();
      if (!noticeExists && shouldNotifyUpdate(remoteManifest.version)) {
        console.debug("[Version Check] Update available (quiet mode)");
        notifyUpdate(currentVersion, remoteManifest.version);
      } else {
        console.debug("[Version Check] Update notice already showing or already notified (quiet mode)");
      }
    } else {
      console.debug("[Version Check] Version is current (quiet mode)");
    }
  } catch (err) {
    console.debug("[Version Check] Silent check failed:", err);
  }
}

/**
 * Checks version and notifies sidepanel if update exists
 */
export async function checkVersionSidepanel() {
  console.debug("[Version Check] Starting sidepanel version check...");
  try {
    const versionUrl = getCacheBreakerUrl(VERSION_CONFIG.GITHUB_VERSION_URL);
    console.debug("[Version Check] Checking URL:", versionUrl);
    const response = await fetch(versionUrl);
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    console.debug(`[Version Check] Sidepanel check - Current: ${currentVersion}, Latest: ${remoteManifest.version}`);

    if (remoteManifest.version > currentVersion) {
      const noticeExists = await isUpdateNoticeShowing();
      if (!noticeExists && shouldNotifyUpdate(remoteManifest.version)) {
        console.debug("[Version Check] Update available, notifying sidepanel");
        chrome.runtime.sendMessage({
          type: "SIDEPANEL_VERSION_UPDATE",
          currentVersion,
          latestVersion: remoteManifest.version,
          updateUrl: VERSION_CONFIG.GITHUB_REPO_URL
        });
      } else {
        console.debug("[Version Check] Update notice already showing or already notified (sidepanel check)");
      }
    } else {
      console.debug("[Version Check] Version is current (sidepanel check)");
    }
  } catch (err) {
    console.debug("[Version Check] Sidepanel check failed:", err);
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
