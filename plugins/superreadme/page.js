(function() {
  if (!window.Superpowers) window.Superpowers = {};

  function callMethod(methodName) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(event) {
        if (!event.data || event.data.direction !== "from-content-script") return;
        if (event.data.type !== "SUPERREADME_RESPONSE") return;
        if (event.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (event.data.success) {
          resolve(event.data.result);
        } else {
          reject(event.data.error);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: "SUPERREADME_CALL",
        requestId,
        payload: { methodName }
      }, "*");
    });
  }

  window.Superpowers.readme = {
    getLLMReadme: () => callMethod("getLLMReadme"),
    getMainReadme: () => callMethod("getMainReadme")
  };
})();
