(function() {
  const PLUGIN_EVENT_TYPE = "SUPER_CONSOLE_EVENT";
  
  // Listen for console events from page
  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== PLUGIN_EVENT_TYPE) return;

    // Forward to service worker
    chrome.runtime.sendMessage({
      type: PLUGIN_EVENT_TYPE,
      level: ev.data.level,
      args: ev.data.args
    });
  });

  // Listen for console events from service worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== PLUGIN_EVENT_TYPE) return;
    
    // Forward to page
    window.postMessage({
      direction: "from-content-script",
      type: PLUGIN_EVENT_TYPE,
      level: msg.level,
      args: msg.args
    }, "*");
  });
})();
