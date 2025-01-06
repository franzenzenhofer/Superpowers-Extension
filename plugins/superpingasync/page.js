
(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  window.Superpowers.asyncPing = function (message) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script") return;
        if (ev.data.type !== "SUPERASYNC_PING_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);

        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(ev.data.error);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: "SUPERASYNC_PING_CALL",
        requestId,
        payload: { message }
      }, "*");
    });
  };

  console.log("[superpingasync/page.js] Superpowers.asyncPing(...) is ready");
})();