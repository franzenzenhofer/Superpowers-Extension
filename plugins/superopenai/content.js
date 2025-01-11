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

  let port = null;
  let isConnecting = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000; // 1 second

  // Function to create and set up the port
  function setupPort() {
    if (isConnecting) return null;
    isConnecting = true;

    try {
      port = chrome.runtime.connect({ name: "stream-channel" });
      
      port.onDisconnect.addListener(() => {
        console.log("[superopenai/content.js] Port disconnected");
        port = null;
        
        // Try to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          setTimeout(() => {
            console.log(`[superopenai/content.js] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            setupPort();
          }, RECONNECT_DELAY);
        }
      });

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

      console.log("[superopenai/content.js] Port connected successfully");
      reconnectAttempts = 0; // Reset attempts on successful connection
      isConnecting = false;
      return port;
    } catch (error) {
      console.error("[superopenai/content.js] Error setting up port:", error);
      isConnecting = false;
      return null;
    }
  }

  // Initial port setup
  setupPort();

  // Ensure we have a valid port before sending messages
  function ensureValidPort() {
    if (!port) {
      port = setupPort();
    }
    return port !== null;
  }

  // Helper to safely post messages to the port
  function safePortPostMessage(message) {
    try {
      if (!ensureValidPort()) {
        throw new Error("Could not establish port connection");
      }
      port.postMessage(message);
      return true;
    } catch (error) {
      console.error("[superopenai/content.js] Error posting message:", error);
      return false;
    }
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== "SUPEROPENAI_CALL") return;

    const { requestId, payload } = event.data;

    // For streaming requests, ensure port connection and notify background
    if (payload.method === "chatCompletionStream") {
      const success = safePortPostMessage({
        type: "INIT_STREAM_PORT",
        requestId
      });

      if (!success) {
        // Notify the page about the connection failure
        window.postMessage({
          direction: "from-content-script",
          type: "SUPEROPENAI_RESPONSE",
          requestId,
          success: false,
          error: "Failed to establish streaming connection"
        }, "*");
        return;
      }
    }

    // Regular message handling
    chrome.runtime.sendMessage(
      {
        type: "SUPEROPENAI_CALL",
        requestId,
        payload
      },
      (response) => {
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
