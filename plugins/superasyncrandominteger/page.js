(function () {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  window.Superpowers.asyncRandomInteger = function (timeMs, minVal, maxVal) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script") return;
        if (ev.data.type !== "SUPERASYNCRANDOMINT_RESPONSE") return;
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
        type: "SUPERASYNCRANDOMINT_CALL",
        requestId,
        payload: { timeMs, minVal, maxVal }
      }, "*");
    });
  };

})();