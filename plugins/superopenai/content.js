(function () {
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
      if (event.data.type !== "SUPEROPENAI_CALL") return;
  
      const { requestId, payload } = event.data;
      
      chrome.runtime.sendMessage(
        { type: "SUPEROPENAI_CALL", requestId, payload },
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
  