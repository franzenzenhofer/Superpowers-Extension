// plugins/superscreenshot/page.js
// Exposes an async function Superpowers.screenshot(urlOrObjOrNothing) that returns a Promise.
// The messaging logic is EXACTLY like superpingasync/page.js, just with "SUPERSCREENSHOT".

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  window.Superpowers.screenshot = function(payload) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      let timeoutId = setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        reject("Operation timed out");
      }, 30000);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script") return;
        if (ev.data.requestId !== requestId) return;

        if (ev.data.type === "SUPERSCREENSHOT_RESPONSE") {
          window.removeEventListener("message", handleResponse);
          clearTimeout(timeoutId);
          ev.data.success ? resolve(ev.data.result) : reject(ev.data.error);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: "SUPERSCREENSHOT",
        requestId,
        payload
      }, "*");
    });
  };

  // console.log("[superscreenshot/page.js] Superpowers.screenshot() ready");
})();
