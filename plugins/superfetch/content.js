// plugins/superfetch/content.js
// content-script context
(function() {
    console.log("[superfetch/content.js] loaded in content-script context");
  
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.direction !== "from-page") return;
      if (event.data.type !== "SUPERFETCH") return;
  
      const { requestId, url, options } = event.data;
      console.log(`[superfetch/content.js] Got SUPERFETCH from page => url: ${url}, requestId: ${requestId}`);
  
      // Send to SW
      chrome.runtime.sendMessage({ 
        type: "SUPERFETCH", 
        url, 
        options,
        requestId 
      }, (response) => {
        console.log("[superfetch/content.js] SW response:", JSON.stringify(response, null, 2));
        
        if (chrome.runtime.lastError) {
          console.error("[superfetch/content.js] Runtime error:", chrome.runtime.lastError);
          return;
        }
    
        sendPageResponse(requestId, {
          success: true,
          status: response.status,
          statusText: response.statusText,
          body: response.body,
          headers: response.headers,
          type: "SUPERFETCH_RESPONSE" // Ensure type is set correctly
        });
      });
    });
  })();
  
  function sendPageResponse(requestId, response) {
    const message = {
        direction: "from-content-script",
        type: "SUPERFETCH_RESPONSE", // Ensure correct type
        requestId,
        ...response
    };
    
    console.log("[superfetch/content.js] Sending message:", JSON.stringify(message, null, 2));
    window.postMessage(message, "*");
}