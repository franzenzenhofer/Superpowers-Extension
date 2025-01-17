// plugins/ga/content.js
// Content-script bridging for GA plugin.
// Relays "GA_CALL" from the page => SW => back to page.

(function () {
  const CALL_TYPE = "GA_CALL";
  const RESPONSE_TYPE = "GA_RESPONSE";
  const EVENT_TYPE = "GA_EVENT";

  // 1) From page => SW
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-page") return;
    if (event.data.type !== CALL_TYPE) return;

    // console.log('🔄 [FLOW] 6. Content script (GA): received message from page:', event.data);

    const { requestId, methodName, args } = event.data;
    chrome.runtime.sendMessage(
      {
        type: CALL_TYPE,
        requestId,
        methodName,
        args
      },
      (response) => {
        // console.log('🔄 [FLOW] 7. Content script (GA): got response from extension:', response);
        
        if (chrome.runtime.lastError) {
          console.error('❌ [FLOW] Content script (GA): runtime error:', chrome.runtime.lastError);
          window.postMessage(
            {
              direction: "from-content-script",
              type: RESPONSE_TYPE,
              requestId,
              success: false,
              error: chrome.runtime.lastError.message
            },
            "*"
          );
          return;
        }

        window.postMessage(
          {
            direction: "from-content-script",
            type: RESPONSE_TYPE,
            requestId,
            success: response?.success,
            result: response?.result,
            error: response?.error
          },
          "*"
        );
      }
    );
  });

  // 2) From SW => page (for events, if any)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === EVENT_TYPE) {
      window.postMessage(
        {
          direction: "from-content-script",
          type: EVENT_TYPE,
          eventName: msg.eventName,
          args: msg.args
        },
        "*"
      );
    }
  });
})();
