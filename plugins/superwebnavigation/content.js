// plugins/superwebnavigation/content.js
// Content script bridging page <-> SW for chrome.webNavigation

(function () {
  const PLUGIN_CALL_TYPE = "SUPER_WEBNAVIGATION_CALL";
  const PLUGIN_RESPONSE_TYPE = "SUPER_WEBNAVIGATION_RESPONSE";
  const PLUGIN_EVENT_TYPE = "SUPER_WEBNAVIGATION_EVENT";

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== PLUGIN_CALL_TYPE) return;

    const { requestId, methodName, args } = ev.data;
    chrome.runtime.sendMessage(
      {
        type: PLUGIN_CALL_TYPE,
        requestId,
        methodName,
        args
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            direction: "from-content-script",
            type: PLUGIN_RESPONSE_TYPE,
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }
        window.postMessage({
          direction: "from-content-script",
          type: PLUGIN_RESPONSE_TYPE,
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === PLUGIN_EVENT_TYPE) {
      window.postMessage({
        direction: "from-content-script",
        type: PLUGIN_EVENT_TYPE,
        eventName: msg.eventName,
        args: msg.args
      }, "*");
    }
  });
})();
