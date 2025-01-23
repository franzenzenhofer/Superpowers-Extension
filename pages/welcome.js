document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('openSidePanel').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
  });
});
