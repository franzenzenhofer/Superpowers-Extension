/**
 * content.js
 * ---------------------------------------------
 * Runs in the content-script context. It:
 *   1) Creates a long-lived Port to the background script for streaming.
 *   2) For streaming requests, sends "INIT_STREAM_PORT" so the background can map requestId => Port.
 *   3) Forwards partial chunks from background => the page as SUPEROPENAI_STREAM_CHUNK.
 *   4) Forwards final response or error as SUPEROPENAI_RESPONSE.
 */

(function() {
  console.log("[superopenai/content.js] loaded in content-script context");

  // 1) Create a Port for streaming
  const port = chrome.runtime.connect({ name: "stream-channel" });

  // 2) If the background posts partial chunks, forward to the page
  port.onMessage.addListener((msg) => {
    if (msg.type === "STREAM_CHUNK") {
      window.postMessage({
        direction: "from-content-script",
        type: "SUPEROPENAI_STREAM_CHUNK",
        requestId: msg.requestId,
        chunk: msg.chunk
      }, "*");
    }
  });

  // 3) Listen for requests from the page
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPEROPENAI_CALL") return;

    const { requestId, payload } = event.data;

    // If this is a streaming request, first tell the background about the port
    if (payload.method === "chatCompletionStream") {
      port.postMessage({
        type: "INIT_STREAM_PORT",
        requestId
      });
    }

    // Then do normal one-shot message to invoke the method
    chrome.runtime.sendMessage(
      {
        type: "SUPEROPENAI_CALL",
        requestId,
        payload
      },
      (response) => {
        // final or error
        if (chrome.runtime.lastError) {
          window.postMessage({
            direction: "from-content-script",
            type: "SUPEROPENAI_RESPONSE",
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }

        window.postMessage({
          direction: "from-content-script",
          type: "SUPEROPENAI_RESPONSE",
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });
})();
