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
                __textData: result.textData, // NEW: Store pre-decoded text data sent from extension
                __used: false, // Track if body has been read

                _readBody() {
                    if (this.__used) {
                        return Promise.reject(new TypeError("Body has already been used."));
                    }
                    this.__used = true;
                    
                    // Check if __rawData exists and is actually an ArrayBuffer
                    if (!this.__rawData || !(this.__rawData instanceof ArrayBuffer)) {
                        console.warn("[superfetch/page] Raw data missing or invalid, returning empty buffer");
                        return Promise.resolve(new ArrayBuffer(0));
                    }
                    
                    // Return a *copy* to prevent mutation issues if read multiple times (though spec forbids it)
                    return Promise.resolve(this.__rawData.slice(0));
                },

                arrayBuffer() {
                    // Prioritize using rawData if it's valid
                    if (this.__rawData instanceof ArrayBuffer) {
                        return this._readBody();
                    }
                    
                    // Log detailed warning about the actual type received
                    if (this.__rawData !== null && this.__rawData !== undefined) {
                        console.warn(
                            `[superfetch/page] response.arrayBuffer() called, but __rawData is not a valid ArrayBuffer. ` +
                            `Type: ${typeof this.__rawData}, Constructor: ${this.__rawData?.constructor?.name}`
                        );
                    } else {
                        console.warn("[superfetch/page] response.arrayBuffer() called, but __rawData is null or undefined");
                    }
                    
                    // If we don't have valid rawData but have textData, create an ArrayBuffer from text as fallback
                    if (typeof this.__textData === 'string' && this.__textData) {
                        console.debug("[superfetch/page] Creating ArrayBuffer from textData as fallback");
                        if (this.__used) {
                            return Promise.reject(new TypeError("Body has already been used."));
                        }
                        this.__used = true;
                        
                        // Convert text to ArrayBuffer
                        const encoder = new TextEncoder();
                        return Promise.resolve(encoder.encode(this.__textData).buffer);
                    }
                    
                    // Ultimate fallback
                    console.warn("[superfetch/page] No valid data for arrayBuffer()");
                    return Promise.resolve(new ArrayBuffer(0));
                },
                
                text() {
                    // If we already have pre-decoded text, use it directly
                    if (typeof this.__textData === 'string') {
                        if (this.__used) {
                            return Promise.reject(new TypeError("Body has already been used."));
                        }
                        this.__used = true;
                        return Promise.resolve(this.__textData);
                    }
                    
                    // Fall back to using textBody (legacy support)
                    if (typeof this.__textBody === 'string') {
                        if (this.__used) {
                            return Promise.reject(new TypeError("Body has already been used."));
                        }
                        this.__used = true;
                        return Promise.resolve(this.__textBody);
                    }
                    
                    // Otherwise try to decode the raw data
                    if (this.__rawData instanceof ArrayBuffer) {
                        try {
                            return this._readBody().then(buffer => {
                                try {
                                    return new TextDecoder("utf-8").decode(buffer);
                                } catch (error) {
                                    console.warn("[superfetch/page] Failed to decode response as text:", error);
                                    return ""; // Return empty string on decode error
                                }
                            });
                        } catch (error) {
                            console.warn("[superfetch/page] Error reading ArrayBuffer:", error);
                            return Promise.resolve("");
                        }
                    }
                    
                    // Ultimate fallback
                    console.warn("[superfetch/page] No valid response body data available for text()");
                    return Promise.resolve("");
                },
                
                json() {
                    // Try to get text first (which handles priority between textData and rawData)
                    return this.text().then(text => {
                        try {
                            if (!text) {
                                throw new SyntaxError("Empty response body, cannot parse JSON");
                            }
                            return JSON.parse(text);
                        } catch (error) {
                            console.error("[superfetch/page] Failed to parse JSON:", error);
                            throw new SyntaxError("Failed to parse JSON: " + error.message);
                        }
                    });
                },
                
                blob() {
                    // Determine MIME type from headers if possible
                    const contentType = this.headers.get('content-type') || '';
                    
                    // Prioritize using rawData if it's valid
                    if (this.__rawData instanceof ArrayBuffer) {
                        try {
                            return this._readBody().then(buffer => new Blob([buffer], { type: contentType }));
                        } catch (error) {
                            console.warn("[superfetch/page] Error creating Blob from ArrayBuffer:", error);
                            // Fall through to text fallback
                        }
                    }
                    
                    // Second priority: textData from extension (most reliable)
                    if (typeof this.__textData === 'string') {
                        if (this.__used) {
                            return Promise.reject(new TypeError("Body has already been used."));
                        }
                        this.__used = true;
                        return Promise.resolve(new Blob([this.__textData], { type: contentType }));
                    }
                    
                    // Third priority: textBody (legacy)
                    if (typeof this.__textBody === 'string') {
                        if (this.__used) {
                            return Promise.reject(new TypeError("Body has already been used."));
                        }
                        this.__used = true;
                        return Promise.resolve(new Blob([this.__textBody], { type: contentType }));
                    }
                    
                    // Ultimate fallback
                    console.warn("[superfetch/page] No valid data for blob()");
                    return Promise.resolve(new Blob([], { type: contentType }));
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
