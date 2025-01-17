export const superurlget_extension = {
  name: "superurlget_extension",

  install(context) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERURLGET_CALL") return false;

      const { methodName, url, config } = request;

      handleUrlGet(methodName, url, config)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => {
          console.error("[superurlget_extension] Error:", error);
          sendResponse({ 
            success: false, 
            error: error.message || String(error)
          });
        });

      return true; // async response
    });
  }
};

/**
 * Updated approach that properly handles "DOMContentLoaded" or "load"
 * events before collecting the page HTML. This avoids partial loads 
 * on sites like Hacker News.
 */
async function handleUrlGet(method, url, config = {}) {
  // Set safer defaults
  const {
    waitForEvent = 'DOMContentLoaded', // Changed default to DOMContentLoaded
    timeoutMs = 30000,
    injectCss,
    injectJs,
    fallbackDelay = 1000 // New: minimum wait time if events fail
  } = config;

  const tab = await chrome.tabs.create({ 
    url, 
    active: false
  });

  try {
    const content = await new Promise((resolve, reject) => {
      let hasResolved = false;
      let fallbackTimer = null;

      // Always set a minimum fallback timer
      const safetyFallback = setTimeout(() => {
        if (!hasResolved) {
          console.warn(`[superurlget_extension] No events fired after ${fallbackDelay}ms, grabbing content anyway...`);
          executeContentGrab(true);
        }
      }, fallbackDelay);

      // Main timeout
      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          console.warn(`[superurlget_extension] Main timeout after ${timeoutMs}ms`);
          executeContentGrab(true);
        }
      }, timeoutMs);

      function executeContentGrab(wasTimeout = false) {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(timeoutId);
        clearTimeout(safetyFallback);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: function(params) {
            return new Promise((resolve) => {
              console.log("[urlget/injection] Starting grab:", {
                readyState: document.readyState,
                wasTimeout: params.wasTimeout,
                eventRequested: params.waitForEvent,
                documentTitle: document.title,
                hasBody: !!document.body,
                contentLength: document.documentElement.outerHTML.length
              });

              function grabContent() {
                // Create a single result object
                const result = {
                  readyState: document.readyState,
                  timeOfCapture: new Date().toISOString(),
                  wasTimeout: params.wasTimeout,
                  contentLength: document.documentElement.outerHTML.length
                };

                if (params.css) {
                  try {
                    const style = document.createElement('style');
                    style.textContent = params.css;
                    document.head.appendChild(style);
                  } catch (e) {
                    console.warn("[urlget/injection] CSS injection failed:", e);
                    result.cssError = e.message;
                  }
                }

                if (params.js) {
                  try {
                    (new Function(params.js))();
                  } catch (e) {
                    console.warn("[urlget/injection] JS injection failed:", e);
                    result.jsError = e.message;
                  }
                }

                // Add method-specific data to the same result object
                switch (params.methodName) {
                  case 'getRenderedPage':
                    result.title = document.title || '';
                    result.url = window.location.href;
                    result.html = document.documentElement.outerHTML;
                    result.text = document.body?.innerText || '';
                    break;
                  case 'getHtml':
                    result.html = document.documentElement.outerHTML;
                    break;
                  case 'getDom':
                    result.html = document.documentElement.outerHTML;
                    break;
                  case 'getText':
                    result.text = document.body?.innerText || '';
                    break;
                }

                resolve(result);
              }

              // More defensive event handling
              try {
                if (document.readyState === 'complete' || 
                    (params.waitForEvent === 'DOMContentLoaded' && 
                     document.readyState !== 'loading')) {
                  grabContent();
                } else {
                  document.addEventListener(params.waitForEvent, () => {
                    grabContent();
                  }, { once: true });
                  
                  // Backup in case event never fires
                  setTimeout(() => {
                    grabContent();
                  }, 2000);
                }
              } catch (e) {
                console.error("[urlget/injection] Event handling failed:", e);
                grabContent(); // Get what we can
              }
            });
          },
          args: [{
            waitForEvent,
            css: injectCss || '',
            js: injectJs || '',
            methodName: method,
            wasTimeout
          }]
        }).then(([injection]) => {
          if (injection.result) {
            resolve(injection.result);
          } else {
            reject(new Error('No content returned'));
          }
        }).catch(error => {
          console.error("[superurlget_extension] Script injection error:", error);
          reject(error);
        });
      }

      // Start immediately
      executeContentGrab(false);
    });

    return content;
  } catch (error) {
    console.error("[superurlget_extension] Operation failed:", error);
    throw error;
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      console.warn('[superurlget_extension] Tab cleanup error:', e);
    }
  }
}
