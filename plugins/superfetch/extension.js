// plugins/superfetch/extension.js (ES module)

export const superfetch_extension = {
    name: "superfetch_extension",
  
    install(context) {
      const { debug } = context;
      if (debug) console.log("[superfetch_extension] Installing superfetch in SW...");
  
      // Register message listener for SUPERFETCH
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request || request.type !== "SUPERFETCH") return;
        console.log(`[superfetch_extension] Received SUPERFETCH => ${request.url}`);
        
        handleSuperfetch(request, sendResponse).catch(err => {
          console.error("[superfetch_extension] superfetch error:", err);
          sendResponse({ success: false, error: err.toString() });
        });
        return true; // async
      });
    }
  };
  
  async function handleSuperfetch(request, sendResponse) {
    const { url, options } = request;
    console.log(`[superfetch_extension] handleSuperfetch => fetching ${url}`);
    try {
      const resp = await fetch(url, options || {});
      const text = await resp.text();
  
      // Convert Headers into an object
      const headerObj = {};
      resp.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
  
      console.log(`[superfetch_extension] fetch success => ${resp.status}`);
      sendResponse({
        success: true,
        status: resp.status,
        statusText: resp.statusText,
        body: text,
        headers: headerObj,
        ok: resp.ok,
        redirected: resp.redirected,
        url: resp.url,
        type: resp.type
      });
    } catch (err) {
      console.error("[superfetch_extension] fetch error =>", err);
      sendResponse({ success: false, error: err.toString() });
    }
  }
  