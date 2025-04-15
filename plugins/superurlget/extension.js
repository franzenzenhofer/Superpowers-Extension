import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

export const superurlget_extension = {
  name: "superurlget_extension",

  install(context) {
    // Define method handlers for the bridge
    const methodHandlers = {
      // Each method call will invoke handleUrlGet with the correct parameters
      getRenderedPage: (methodName, args) => handleUrlGet(methodName, args[0], args[1] || {}),
      getHtml: (methodName, args) => handleUrlGet(methodName, args[0], args[1] || {}),
      getDom: (methodName, args) => handleUrlGet(methodName, args[0], args[1] || {}), // Alias for getHtml in current implementation
      getText: (methodName, args) => handleUrlGet(methodName, args[0], args[1] || {}),
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'superurlget',
      methodHandlers,
    });

    /*
    console.log("[superurlget_extension] Extension bridge initialized.");
    */
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

  // Validate URL early
  if (!url || typeof url !== 'string') {
    throw new Error("[superurlget] URL must be a non-empty string.");
  }
  try {
    new URL(url); // Check if URL is valid
  } catch (e) {
    throw new Error(`[superurlget] Invalid URL provided: ${url}`);
  }

  let tabId = null; // Keep track of created tab ID
  try {
    const tab = await chrome.tabs.create({
      url,
      active: false
    });
    tabId = tab.id;
    if (!tabId) {
        throw new Error("Failed to create tab for URL get.");
    }

    const content = await new Promise((resolve, reject) => {
      let hasResolved = false;
      let fallbackTimer = null;
      let timeoutId = null; // Define timeoutId here

      // Cleanup function
      const cleanup = () => {
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimer);
        // Remove any potential listeners added within the injected script if possible/necessary
      };

      // Always set a minimum fallback timer
      fallbackTimer = setTimeout(() => {
        if (!hasResolved) {
          console.warn(`[superurlget_extension] Fallback timer (${fallbackDelay}ms) triggered for ${url}, grabbing content...`);
          executeContentGrab(true);
        }
      }, fallbackDelay);

      // Main timeout
      timeoutId = setTimeout(() => {
        if (!hasResolved) {
          console.warn(`[superurlget_extension] Main timeout (${timeoutMs}ms) triggered for ${url}`);
          reject(new Error(`Timeout after ${timeoutMs}ms waiting for URL content.`));
          // Important: Don't call executeContentGrab on main timeout, reject directly.
        }
      }, timeoutMs);

      function executeContentGrab(wasTimeout = false) { // wasTimeout isn't really used now
        if (hasResolved) return;

        // Inject script to grab content
        chrome.scripting.executeScript({
          target: { tabId: tabId }, // Use tracked tabId
          func: function(params) {
            // --- Injected Script --- 
            return new Promise((resolveInjection, rejectInjection) => {
                let injectionResolved = false;
                const cleanupInjection = () => {
                  // Remove listeners added by this script
                  document.removeEventListener(params.waitForEvent, onContentReady);
                };

                const onContentReady = () => {
                    if (injectionResolved) return;
                    injectionResolved = true;
                    cleanupInjection();
                    console.log(`[urlget/injection] Event '${params.waitForEvent}' or readyState reached.`);
                    grabContent().then(resolveInjection).catch(rejectInjection);
                };

                const grabContent = async () => {
                    console.log("[urlget/injection] Grabbing content...");
                    // Slight delay for final rendering touches after event
                    await new Promise(res => setTimeout(res, 100)); 

                    const result = {
                        readyStateAtCapture: document.readyState,
                        timeOfCapture: new Date().toISOString(),
                        finalUrl: window.location.href, // Capture final URL after potential redirects
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

                    switch (params.methodName) {
                      case 'getRenderedPage':
                        result.title = document.title || '';
                        result.html = document.documentElement.outerHTML;
                        result.text = document.body?.innerText || '';
                        break;
                      case 'getHtml':
                      case 'getDom': // Treat DOM as HTML
                        result.html = document.documentElement.outerHTML;
                        break;
                      case 'getText':
                        result.text = document.body?.innerText || '';
                        break;
                    }
                    return result;
                };

                // Check initial readyState
                if (document.readyState === 'complete' || 
                    (params.waitForEvent === 'DOMContentLoaded' && document.readyState !== 'loading')) {
                    console.log(`[urlget/injection] Already ready (state: ${document.readyState}), grabbing content.`);
                    onContentReady();
                } else {
                    console.log(`[urlget/injection] Waiting for event '${params.waitForEvent}'... (current state: ${document.readyState})`);
                    document.addEventListener(params.waitForEvent, onContentReady, { once: true, capture: true });
                }
            });
            // --- End Injected Script ---
          },
          args: [{
            waitForEvent,
            css: injectCss || '',
            js: injectJs || '',
            methodName: method,
          }]
        }).then(([injectionResult]) => {
            if (!hasResolved) {
              hasResolved = true;
              cleanup();
              if (injectionResult?.result) {
                  console.log(`[superurlget_extension] Content grabbed successfully for ${url}`);
                  resolve(injectionResult.result);
              } else {
                  console.warn(`[superurlget_extension] Injection completed but no result for ${url}`, injectionResult);
                  reject(new Error('Script executed but no content returned from page.'));
              }
            }
        }).catch(error => {
            if (!hasResolved) {
              hasResolved = true;
              cleanup();
              console.error(`[superurlget_extension] Script injection failed for ${url}:`, error);
              reject(new Error(`Failed to execute script in tab: ${error.message}`));
            }
        });
      }

      // Don't execute immediately, wait for fallback timer or main timeout logic
      // This assumes the event listener in the injected script is the primary mechanism.
      // The fallback timer will trigger executeContentGrab if events are slow/fail.

    }); // End Promise

    return content;
  } catch (error) {
    console.error(`[superurlget_extension] Operation failed for URL ${url}:`, error);
    throw error; // Re-throw error to be caught by the bridge handler
  } finally {
    // Ensure the tab is always cleaned up
    if (tabId) {
        try {
            await chrome.tabs.remove(tabId);
            // console.log(`[superurlget_extension] Cleaned up tab ${tabId}`);
        } catch (e) {
            // Ignore errors if tab is already gone
            if (!e.message.toLowerCase().includes("no tab with id")) {
               console.warn(`[superurlget_extension] Tab cleanup error for tab ${tabId}:`, e.message);
            }
        }
    }
  }
}
