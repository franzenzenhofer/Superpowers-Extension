(function () {
  if (!window.Superpowers) window.Superpowers = {};
  if (!window.Superpowers.OpenAI) window.Superpowers.OpenAI = {};

  /**
   * A small helper to create a function that sends a request to the content script
   * and waits for the corresponding "SUPEROPENAI_RESPONSE".
   */
  function createOpenAICall(method) {
    return function(payload) {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).slice(2);

        function handleResponse(ev) {
          if (!ev.data || ev.data.direction !== "from-content-script") return;
          if (ev.data.type !== "SUPEROPENAI_RESPONSE") return;
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
          type: "SUPEROPENAI_CALL",
          requestId,
          payload: { method, ...payload }
        }, "*");
      });
    };
  }

  /**
   * Expose ALL OpenAI methods, including the new "chatCompletionStream"
   * so that minichat.html can call it.
   */
  window.Superpowers.OpenAI = {
    // Existing, synchronous calls
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
    },

    // Audio
    audioSpeech: createOpenAICall("audioSpeech"),
    audioTranscription: createOpenAICall("audioTranscription"),
    audioTranslation: createOpenAICall("audioTranslation"),

    // Embeddings
    embeddings: createOpenAICall("embeddings"),

    // Fine-tuning
    fineTuneCreate: createOpenAICall("fineTuneCreate"),
    fineTuneList: createOpenAICall("fineTuneList"),
    fineTuneRetrieve: createOpenAICall("fineTuneRetrieve"),
    fineTuneCancel: createOpenAICall("fineTuneCancel"),
    fineTuneListEvents: createOpenAICall("fineTuneListEvents"),
    fineTuneListCheckpoints: createOpenAICall("fineTuneListCheckpoints"),

    // Files
    fileUpload: createOpenAICall("fileUpload"),
    fileList: createOpenAICall("fileList"),
    fileRetrieve: createOpenAICall("fileRetrieve"),
    fileDelete: createOpenAICall("fileDelete"),
    fileContent: createOpenAICall("fileContent"),

    // Models
    modelList: createOpenAICall("modelList"),
    modelRetrieve: createOpenAICall("modelRetrieve"),
    modelDelete: createOpenAICall("modelDelete"),

    // Batches
    batchCreate: createOpenAICall("batchCreate"),
    batchRetrieve: createOpenAICall("batchRetrieve"),
    batchCancel: createOpenAICall("batchCancel"),
    batchList: createOpenAICall("batchList"),

    // NEW: streaming chat completions
    chatCompletionStream: createOpenAICall("chatCompletionStream")
  };

  console.log("[superopenai/page.js] window.Superpowers.OpenAI methods are ready, including chatCompletionStream.");
})();
