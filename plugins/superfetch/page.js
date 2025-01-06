// plugins/superfetch/page.js
(function() {
    const DEBUG = {
        log: (msg) => console.log(`[superfetch/page.js] ${msg}`),
        error: (msg) => console.error(`[superfetch/page.js] ${msg}`)
    };

    if (!window.Superpowers) {
        window.Superpowers = {};
        DEBUG.log("Created window.Superpowers object");
    }

    window.Superpowers.fetch = async function(url, options = {}) {
        DEBUG.log(`fetch(${url}) called`);
        
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).slice(2);
            DEBUG.log(`Created requestId: ${requestId}`);

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Superfetch timeout after 30s"));
            }, 30000);

            function handleResponse(ev) {
                DEBUG.log(`Received message: ${JSON.stringify(ev.data, null, 2)}`);
                
                if (!ev.data || ev.data.direction !== "from-content-script") {
                    DEBUG.log("Ignoring non-content-script message");
                    return;
                }
                
                if (ev.data.type !== "SUPERFETCH_RESPONSE") {
                    DEBUG.log(`Ignoring non-SUPERFETCH_RESPONSE message: ${ev.data.type}`);
                    return;
                }
                
                if (ev.data.requestId !== requestId) {
                    DEBUG.log(`Ignoring response for different requestId: ${ev.data.requestId}`);
                    return;
                }

                DEBUG.log(`Got matching SUPERFETCH_RESPONSE for ${requestId}`);
                cleanup();

                if (ev.data.success) {
                    DEBUG.log(`Success response: status=${ev.data.status}`);
                    
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
                DEBUG.log("Cleaning up event listener");
                window.removeEventListener("message", handleResponse);
                clearTimeout(timeout);
            }

            window.addEventListener("message", handleResponse);
            
            DEBUG.log(`Posting SUPERFETCH message to content script`);
            window.postMessage({
                direction: "from-page",
                type: "SUPERFETCH",
                requestId,
                url,
                options
            }, "*");
        });
    };

    DEBUG.log("Initialized");
})();