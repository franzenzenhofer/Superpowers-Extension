(function () {
  if (!window.Superpowers) window.Superpowers = {};
  if (!window.Superpowers.OpenAI) window.Superpowers.OpenAI = {};

  window.Superpowers.OpenAI.test = function () {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script") return;
        if (ev.data.type !== "SUPEROPENAI_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (ev.data.success) resolve(ev.data.result);
        else reject(ev.data.error);
      }

      window.addEventListener("message", handleResponse);
      window.postMessage({
        direction: "from-page",
        type: "SUPEROPENAI_CALL",
        requestId,
        payload: { method: "test" }
      }, "*");
    });
  };
})();