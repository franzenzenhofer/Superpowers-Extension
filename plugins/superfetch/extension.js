// plugins/superfetch/extension.js

export const superfetch_extension = {
  name: "superfetch_extension",

  install(context) {
    // Register message listener for SUPERFETCH
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request || request.type !== "SUPERFETCH") return;

      handleSuperfetch(request)
        .then(resp => {
          sendResponse(resp);
        })
        .catch(err => {
          console.error("[superfetch_extension] superfetch error:", err);
          sendResponse({ success: false, error: err.toString() });
        });
      return true; // async
    });
  }
};

/**
* The main logic. We do:
*   1) fetch(url, options)
*   2) read the body as ArrayBuffer to preserve binary
*   3) build response object => return to caller
*/
async function handleSuperfetch(request) {
  const { url, options, requestId } = request;

  try {
      const fetchOptions = {
          method: options.method || "GET",
          headers: options.headers || {},
          body: options.body || undefined,
          redirect: options.redirect || "follow",
          mode: options.mode || "cors",
          credentials: options.credentials || "same-origin",
          cache: options.cache,
          referrerPolicy: options.referrerPolicy
      };

      // If the user passed 'signal', let's attach it (non-breaking)
      if (options.signal) {
        fetchOptions.signal = options.signal;
      }
      // Optionally handle other fields like referrer, integrity, keepalive if needed
      if (typeof options.referrer !== "undefined") {
        fetchOptions.referrer = options.referrer;
      }
      if (typeof options.integrity !== "undefined") {
        fetchOptions.integrity = options.integrity;
      }
      if (typeof options.keepalive !== "undefined") {
        fetchOptions.keepalive = options.keepalive;
      }

      // Actually fetch
      const resp = await fetch(url, fetchOptions);

      // We'll read the raw data as an ArrayBuffer for best fidelity
      const arrayBuffer = await resp.arrayBuffer();

      // Also read text for older fallback usage (like your old approach).
      // This is optional; you can skip if you prefer. But let's keep
      // old 'body' string for perfect backward compat.
      const fallbackText = new TextDecoder("utf-8").decode(arrayBuffer);

      // Convert headers into a plain object
      const headerObj = {};
      resp.headers.forEach((value, key) => {
          headerObj[key.toLowerCase()] = value;
      });

      return {
          success: true,
          status: resp.status,
          statusText: resp.statusText,
          // We'll pass the fallback text in 'body'
          // plus the raw ArrayBuffer in 'rawData'
          body: fallbackText,
          rawData: arrayBuffer,
          headers: headerObj,
          ok: resp.ok,
          redirected: resp.redirected,
          url: resp.url,
          type: resp.type
      };
  } catch (err) {
      console.error("[superfetch_extension] fetch error =>", err);
      return { success: false, error: err.toString() };
  }
}
