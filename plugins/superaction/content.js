// plugins/superaction/content.js
// Content script bridging page <-> SW for chrome.action

(function() {
  const CALL_TYPE = "SUPER_ACTION_CALL";
  const RESPONSE_TYPE = "SUPER_ACTION_RESPONSE";
  const EVENT_TYPE = "SUPER_ACTION_EVENT";

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== CALL_TYPE) return;

    const { requestId, methodName, args } = ev.data;
    chrome.runtime.sendMessage({
      type: CALL_TYPE,
      requestId,
      methodName,
      args
    }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          direction: "from-content-script",
          type: RESPONSE_TYPE,
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, "*");
        return;
      }
      window.postMessage({
        direction: "from-content-script",
        type: RESPONSE_TYPE,
        requestId,
        success: response?.success,
        result: response?.result,
        error: response?.error
      }, "*");
    });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === EVENT_TYPE) {
      window.postMessage({
        direction: "from-content-script",
        type: EVENT_TYPE,
        eventName: msg.eventName,
        args: msg.args
      }, "*");
    }
  });
})();
