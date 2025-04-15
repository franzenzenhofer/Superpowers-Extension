// plugins/superfetch/page.js
// Provides Superpowers.fetch API - uses bridge-compatible message types.

(function() {
    // Use bridge-compatible message types for communication
    const CALL_TYPE = 'SUPER_SUPERFETCH_CALL';
    const RESPONSE_TYPE = 'SUPER_SUPERFETCH_RESPONSE';
    // Default request timeout (managed by the message listener)
    const REQUEST_TIMEOUT_MS = 30000; // 30 seconds for the message roundtrip

    // Debug logging
    const log = (...args) => console.debug('[superfetch/page]', ...args);
    const errLog = (...args) => console.error('[superfetch/page]', ...args);

    const activeRequests = new Map(); // Track requestIds for cleanup

    if (!window.Superpowers) {
        window.Superpowers = {};
    }

    // --- Configuration ---
    // Timeout config for the actual fetch operation (performed in extension.js)
    let SUPERFETCH_TIMEOUT_MS_CONFIG = 120000; // Default 2 minutes
    window.Superpowers.setSuperfetchTimeout = function(ms) {
        if (typeof ms === 'number' && ms > 0) {
            SUPERFETCH_TIMEOUT_MS_CONFIG = ms;
            log(`Fetch timeout configured to ${ms}ms`);
            // Note: This currently only sets a local config value.
            // The actual fetch timeout is managed in extension.js.
        } else {
            errLog('Invalid timeout value provided to setSuperfetchTimeout');
        }
    };

    window.Superpowers.getSuperfetchTimeout = function() {
        return SUPERFETCH_TIMEOUT_MS_CONFIG;
    }

    // --- Active Requests ---
    window.Superpowers.whatsGoingOn = function() {
        return Array.from(activeRequests.values());
    };

    // --- Minimal Headers Class (Read-Only) ---
    class SuperfetchHeaders {
        constructor(headersObj = {}) {
            this.map = new Map(Object.entries(headersObj));
        }
        get(name) { return this.map.get(name?.toLowerCase()) || null; }
        has(name) { return this.map.has(name?.toLowerCase()); }
        forEach(callback, thisArg) {
            for (const [k, v] of this.map.entries()) {
                callback.call(thisArg, v, k, this);
            }
        }
        entries() { return this.map.entries(); }
        keys() { return this.map.keys(); }
        values() { return this.map.values(); }
        [Symbol.iterator]() { return this.map.entries(); }
    }

    // --- Message Listener ---
    window.addEventListener("message", (event) => {
        // Basic validation
        if (!event.data || event.data.direction !== "from-content-script" || event.data.type !== RESPONSE_TYPE) {
            return;
        }

        const { requestId, success, result, error } = event.data;
        log(`Received ${RESPONSE_TYPE}`, { requestId, success });

        const pending = activeRequests.get(requestId);
        if (!pending) {
            log('Ignoring response for unknown or timed-out request:', requestId);
            return; // Ignore if request not found or already handled
        }

        // Clean up timeout and pending request
        clearTimeout(pending.timeoutId);
        activeRequests.delete(requestId);

        if (success) {
            // Build the Response-like object
            const superHeaders = new SuperfetchHeaders(result.headers);
            const superResponse = {
                status: result.status,
                statusText: result.statusText,
                ok: result.ok,
                redirected: result.redirected,
                url: result.url,
                type: result.type, // e.g., 'basic', 'cors', 'opaque'
                headers: superHeaders,

                // Store raw data (ArrayBuffer) for multi-read
                __rawData: result.rawData, // Expecting ArrayBuffer here
                __textBody: result.body,   // For backward compatibility
                __used: false, // Track if body has been read

                _readBody() {
                    if (this.__used) {
                        return Promise.reject(new TypeError("Body has already been used."));
                    }
                    this.__used = true;
                    if (!this.__rawData) {
                         // Should not happen if extension sends ArrayBuffer
                        return Promise.resolve(new ArrayBuffer(0));
                    }
                    // Return a *copy* to prevent mutation issues if read multiple times (though spec forbids it)
                    return Promise.resolve(this.__rawData.slice(0));
                },

                arrayBuffer() {
                    return this._readBody();
                },
                text() {
                    if (this.__rawData) {
                        return this._readBody().then(buffer => new TextDecoder("utf-8").decode(buffer));
                    }
                    return Promise.resolve(this.__textBody || "");
                },
                json() {
                    return this.text().then(text => JSON.parse(text));
                },
                blob() {
                    // Determine MIME type from headers if possible
                    const contentType = this.headers.get('content-type') || '';
                    return this._readBody().then(buffer => new Blob([buffer], { type: contentType }));
                },

                // Extras for debugging or info
                _superfetch: {
                    requestId,
                    timestamp: result.timestamp || Date.now(),
                    rawHeaders: result.headers, // Plain object
                }
            };
            pending.resolve(superResponse);
        } else {
            errLog(`Request ${requestId} failed:`, error);
            pending.reject(new Error(error || "Unknown superfetch error"));
        }
    });

    // --- The Fetch Function ---
    window.Superpowers.fetch = function(url, options = {}) {
        log(`Initiating fetch for: ${url}`, options);
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

            // Set up a timeout for the *message roundtrip*
            const timeoutId = setTimeout(() => {
                if (activeRequests.has(requestId)) {
                    activeRequests.get(requestId).reject(new Error(`[Superpowers.fetch] Request timed out waiting for response (${REQUEST_TIMEOUT_MS}ms)`));
                    activeRequests.delete(requestId); // Clean up
                    errLog(`Request ${requestId} timed out waiting for response.`);
                }
            }, REQUEST_TIMEOUT_MS);

            // Store pending request details
            activeRequests.set(requestId, {
                requestId,
                url,
                startTime: Date.now(),
                options,
                resolve,
                reject,
                timeoutId // Store timeoutId for cleanup
            });

            log(`Sending ${CALL_TYPE}`, { requestId, url });
            // Send message to content script, using bridge format
            window.postMessage({
                direction: "from-page",
                type: CALL_TYPE,
                requestId,
                methodName: 'fetch', // Explicitly set methodName for the bridge handler
                args: [url, options], // Pass url and options as arguments array
            }, "*");
        });
    };

    log('Superpowers.fetch initialized using bridge-compatible messaging.');
})();
