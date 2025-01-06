// plugins/superping/page.js
// Runs in the real page context. Exposes a synchronous function: Superpowers.ping(msg).

(function() {
  // Ensure we have a namespace for Superpowers
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  /**
   * Synchronous method from the page’s perspective.
   * 1) Immediately returns `msg`.
   * 2) Also sends a message to the content-script (which sends to SW).
   */
  window.Superpowers.ping = function(msg) {
    // 1) Send bridging message (does not block)
    window.postMessage(
      {
        direction: "from-page",
        type: "SUPERPING",
        payload: msg
      },
      "*"
    );

    // 2) Return `msg` synchronously
    return msg;
  };

  console.log("[superping/page.js] Superpowers.ping() ready");
})();
