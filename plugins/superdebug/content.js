// plugins/superdebug/content.js
(function() {
  // console.log("[superdebug/content.js] loaded in content-script context");

  // Listen for messages from the page
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERPOWERS_DEBUGLOG") return;

    const { payload } = event.data;

    // Relay to service worker WITHOUT a callback
    chrome.runtime.sendMessage({
      type: "SUPERPOWERS_DEBUGLOG",
      payload
    });
  });
})();
