(function () {
  if (!window.Superpowers) window.Superpowers = {};
  if (!window.Superpowers.OpenAI) window.Superpowers.OpenAI = {};

  function createOpenAICall(method) {
    return function(payload) {
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
          payload: { method, ...payload }
        }, "*");
      });
    };
  }

  // Expose all OpenAI methods
  window.Superpowers.OpenAI = {
    test: createOpenAICall("test"),
    chatCompletion: createOpenAICall("chatCompletion"),
    imageGeneration: createOpenAICall("imageGeneration"),
    structuredCompletion: createOpenAICall("structuredCompletion"),
    functionCall: createOpenAICall("functionCall"),
    setApiKey: function(key) {
      return createOpenAICall("setApiKey")({ key });
    },
    setOrganizationId: function(orgId) {
      return createOpenAICall("setOrganizationId")({ orgId });
    }
  };

  console.log("[superopenai/page.js] window.Superpowers.OpenAI methods are ready");
})();