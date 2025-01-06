// plugins/superping/content.js
// Content-script bridging for Superping.
// We listen for "SUPERPING" messages from the real page => forward to SW => no real response needed.

(function() {
  console.log("[superping/content.js] loaded in content-script context");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPERPING") return;

    // The page wants to do a synchronous ping. We simply forward the payload to SW.
    console.log("[superping/content.js] Relay SUPERPING to SW =>", event.data.payload);

    chrome.runtime.sendMessage(
      {
        type: "SUPERPING",
        payload: event.data.payload
      },
      (response) => {
        // Even though we get a callback here, the page doesn't wait for it.
        if (chrome.runtime.lastError) {
          console.error("[superping/content.js] runtime.lastError:", chrome.runtime.lastError);
        } else {
          console.log("[superping/content.js] SW responded:", response);
        }
        // No need to post a response back to the page, because 
        // our `Superpowers.ping()` is synchronous from the page’s POV.
      }
    );
  });
})();
