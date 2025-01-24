document.addEventListener('DOMContentLoaded', () => {
  const sideBtn = document.getElementById('openSidePanel');
  const credsBtn = document.getElementById('openCredsManager');

  sideBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
  });

  credsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_CREDENTIALS_MANAGER" });
    // Fallback if message doesn't work
    chrome.tabs.create({
      url: chrome.runtime.getURL('pages/credentials_manager.html')  // Fixed filename
    });
  });
});
