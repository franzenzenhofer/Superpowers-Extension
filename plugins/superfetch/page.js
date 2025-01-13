// plugins/superfetch/page.js
(function() {
    const DEBUG = {
        log: (msg) => {}, // Comment out or empty to suppress logs
        error: (msg) => console.error(`[superfetch/page.js] ${msg}`)
    };

    let SUPERFETCH_TIMEOUT_MS = 120000;
    const activeRequests = new Map();

    if (!window.Superpowers) {
        window.Superpowers = {};
    }

    window.Superpowers.setSuperfetchTimeout = function(ms) {
        SUPERFETCH_TIMEOUT_MS = ms;
    };

    window.Superpowers.whatsGoingOn = function() {
        return Array.from(activeRequests.values());
    };

    window.Superpowers.fetch = async function(url, options = {}) {
        
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).slice(2);
            activeRequests.set(requestId, { requestId, url, startTime: Date.now() });

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Superfetch timeout after ${SUPERFETCH_TIMEOUT_MS / 1000}s`));
            }, SUPERFETCH_TIMEOUT_MS);

            function handleResponse(ev) {
                
                if (!ev.data || ev.data.direction !== "from-content-script") {
                    return;
                }
                
                if (ev.data.type !== "SUPERFETCH_RESPONSE") {
                    return;
                }
                
                if (ev.data.requestId !== requestId) {
                    return;
                }

                cleanup();

                if (ev.data.success) {
                    
                    // Create enhanced response object but keep original headers handling
                    const superResponse = {
                        // Standard properties (keeping original header handling)
                        status: ev.data.status,
                        statusText: ev.data.statusText,
                        ok: ev.data.ok,
                        redirected: ev.data.redirected,
                        url: ev.data.url,
                        type: ev.data.type,
                        headers: ev.data.headers,

                        // Standard methods
                        text: () => Promise.resolve(ev.data.body),
                        json: () => Promise.resolve(ev.data.body).then(JSON.parse),
                        blob: () => Promise.resolve(new Blob([ev.data.body])),
                        arrayBuffer: () => Promise.resolve(new TextEncoder().encode(ev.data.body).buffer),

                        // Superpowers extras
                        _superfetch: {
                            requestId,
                            timestamp: Date.now(),
                            rawHeaders: ev.data.headers,
                            rawBody: ev.data.body,
                            performance: {
                                fetchStart: Date.now(),
                                responseEnd: Date.now()
                            }
                        },

                        // Helper methods
                        getHeadersObject: function() {
                            return this.headers;
                        }
                    };
                    
                    resolve(superResponse);
                } else {
                    DEBUG.error(`Error response: ${ev.data.error}`);
                    reject(ev.data.error || "Unknown superfetch error");
                }
            }

            function cleanup() {
                activeRequests.delete(requestId);
                window.removeEventListener("message", handleResponse);
                clearTimeout(timeout);
            }

            window.addEventListener("message", handleResponse);
            
            window.postMessage({
                direction: "from-page",
                type: "SUPERFETCH",
                requestId,
                url,
                options
            }, "*");
        });
    };

})();