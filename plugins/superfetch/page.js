// plugins/superfetch/page.js
(function() {
    const DEBUG = {
        // Minimal logging
        log: (msg) => { /* no console.log by default */ },
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

    // A minimal "read-only" Headers class
    class SuperfetchHeaders {
        constructor(headersObj) {
            // headersObj is a plain object { name -> value }, all lowercased keys
            // We'll store them in a Map internally
            this.map = new Map(Object.entries(headersObj));
        }
        get(name) {
            if (!name) return null;
            return this.map.get(name.toLowerCase()) || null;
        }
        has(name) {
            return this.map.has(name.toLowerCase());
        }
        forEach(callback, thisArg) {
            for (const [k, v] of this.map.entries()) {
                callback.call(thisArg, v, k, this);
            }
        }
        entries() {
            return this.map.entries();
        }
        // Optional: Provide keys() / values() for convenience
        keys() {
            return this.map.keys();
        }
        values() {
            return this.map.values();
        }
        // The real spec disallows modifying a Response's headers
        // so we omit .set(), .append(), .delete() or make them no-ops.
    }

    window.Superpowers.fetch = async function(url, options = {}) {
        // Add a safe default for redirect if not provided:
        if (!options.redirect) {
            options.redirect = 'follow'; // same default as normal fetch
        }

        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).slice(2);

            activeRequests.set(requestId, {
                requestId,
                url,
                startTime: Date.now(),
                redirect: options.redirect
            });

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Superfetch timeout after ${SUPERFETCH_TIMEOUT_MS / 1000}s`));
            }, SUPERFETCH_TIMEOUT_MS);

            function handleResponse(ev) {
                if (!ev.data || ev.data.direction !== "from-content-script") return;
                if (ev.data.type !== "SUPERFETCH_RESPONSE") return;
                if (ev.data.requestId !== requestId) return;

                cleanup();

                if (ev.data.success) {
                    // We'll store the rawData as an ArrayBuffer in ev.data.rawData
                    // for more accurate usage of text, blob, etc.
                    // Fallback to old .body if rawData is missing => old approach
                    const arrayBuffer = ev.data.rawData || null;
                    const textBody = ev.data.body || "";

                    // Build an enhanced response object that mimics fetch Response
                    const superHeaders = new SuperfetchHeaders(ev.data.headers);

                    const superResponse = {
                        status: ev.data.status,
                        statusText: ev.data.statusText,
                        ok: ev.data.status >= 200 && ev.data.status < 300,
                        redirected: ev.data.redirected,
                        url: ev.data.url,
                        type: ev.data.type,
                        headers: superHeaders,

                        // Keep multi-read logic for backward compatibility
                        // We'll store the rawData in a property so we can read it multiple times.
                        __rawData: arrayBuffer,
                        __textBody: textBody,

                        text: function() {
                            // If we have a real ArrayBuffer, decode as UTF-8
                            if (this.__rawData) {
                                const dec = new TextDecoder("utf-8");
                                return Promise.resolve(dec.decode(this.__rawData));
                            }
                            // else fallback to old .body string
                            return Promise.resolve(this.__textBody);
                        },
                        json: function() {
                            return this.text().then(JSON.parse);
                        },
                        blob: function() {
                            if (this.__rawData) {
                                return Promise.resolve(new Blob([this.__rawData]));
                            }
                            return Promise.resolve(new Blob([this.__textBody]));
                        },
                        arrayBuffer: function() {
                            if (this.__rawData) {
                                return Promise.resolve(this.__rawData);
                            }
                            // fallback: encode text as arrayBuffer
                            const buf = new TextEncoder().encode(this.__textBody).buffer;
                            return Promise.resolve(buf);
                        },

                        // Some extras for debugging
                        _superfetch: {
                            requestId,
                            timestamp: Date.now(),
                            rawHeaders: ev.data.headers,
                            // We keep rawBody for old reference, even though we might store rawData
                            rawBody: ev.data.body
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
