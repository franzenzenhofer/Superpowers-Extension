// plugins/superenv/content.js
// content-script context. 
// Listen for SUPERENV_GET_VARS / SUPERENV_SET_VARS messages -> call chrome.runtime.

(function(){
    // Memory management constants
    const MAX_QUEUE_LENGTH = 100;
    const CLEANUP_INTERVAL = 30000; // 30s
    const MAX_CACHE_SIZE = 512 * 1024; // 512KB

    console.log("[superenv/content.js] loaded in content-script context");

    // Enhanced cache with size checking
    let envVarsCache = null;
    let lastFetchTime = 0;
    const CACHE_TTL = 1000; // 1 second cache TTL

    // Memory-efficient queue
    const messageQueue = {
        items: [],
        push(item) {
            if (this.items.length >= MAX_QUEUE_LENGTH) {
                this.items.shift(); // Remove oldest
            }
            this.items.push(item);
        },
        clear() {
            this.items.length = 0;
        },
        get length() {
            return this.items.length;
        }
    };

    let isProcessingQueue = false;
    let frameRequest = null;

    // Fast event type check
    const VALID_TYPES = {
        SUPERENV_GET_VARS: 1,
        SUPERENV_SET_VARS: 1
    };

    // Cleanup function
    function performCleanup() {
        // Clear stale cache
        if (lastFetchTime && (Date.now() - lastFetchTime > CACHE_TTL * 2)) {
            envVarsCache = null;
        }

        // Clear queue if not processing
        if (!isProcessingQueue) {
            messageQueue.clear();
        }

        // Check cache size
        if (envVarsCache && JSON.stringify(envVarsCache).length > MAX_CACHE_SIZE) {
            envVarsCache = null;
        }

        if (frameRequest) {
            cancelAnimationFrame(frameRequest);
            frameRequest = null;
        }
    }

    // Set up periodic cleanup
    const cleanupInterval = setInterval(performCleanup, CLEANUP_INTERVAL);

    // Clean up on unload
    window.addEventListener('unload', () => {
        clearInterval(cleanupInterval);
        performCleanup();
    }, { once: true });

    // Modified processMessageQueue with memory checks
    async function processMessageQueue() {
        if (messageQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }

        isProcessingQueue = true;

        // Process in smaller chunks
        const chunk = messageQueue.items.splice(0, 10);
        const getVarsRequests = new Map();
        const setVarsRequests = new Map();
        
        // Group similar requests
        chunk.forEach(({event, resolve}) => {
            const type = event.data?.type;
            if (type === 'SUPERENV_GET_VARS') {
                getVarsRequests.set(event.data.requestId, {event, resolve});
            } else if (type === 'SUPERENV_SET_VARS') {
                setVarsRequests.set(event.data.requestId, {event, resolve});
            }
        });

        try {
            // Process GET requests with size check
            if (getVarsRequests.size > 0) {
                const vars = await getEnvVars();
                if (JSON.stringify(vars).length <= MAX_CACHE_SIZE) {
                    getVarsRequests.forEach(({event, resolve}) => {
                        resolve({
                            direction: "from-content-script",
                            type: "SUPERENV_GET_VARS_RESPONSE",
                            requestId: event.data.requestId,
                            success: true,
                            result: vars
                        });
                    });
                }
            }

            // Process SET requests (take only the latest one)
            if (setVarsRequests.size > 0) {
                const lastSetRequest = Array.from(setVarsRequests.values()).pop();
                const response = await new Promise(resolve => {
                    chrome.runtime.sendMessage({
                        type: "SET_ENV_VARS",
                        envVars: lastSetRequest.event.data.vars
                    }, (resp) => {
                        if (resp?.success) {
                            envVarsCache = lastSetRequest.event.data.vars;
                            lastFetchTime = Date.now();
                        }
                        resolve(resp);
                    });
                });

                // Respond to all SET requests with the final state
                setVarsRequests.forEach(({event, resolve}) => {
                    resolve({
                        direction: "from-content-script",
                        type: "SUPERENV_SET_VARS_RESPONSE",
                        requestId: event.data.requestId,
                        success: !!(response?.success),
                        result: response || {}
                    });
                });
            }
        } catch (error) {
            console.error('[superenv] Queue processing error:', error);
        }

        // Clear processed messages
        messageQueue.clear();
        
        // Schedule next batch if needed
        if (messageQueue.length > 0) {
            frameRequest = requestAnimationFrame(() => processMessageQueue());
        } else {
            isProcessingQueue = false;
        }
    }

    // Enhanced event listener with memory checks
    const messageHandler = (event) => {
        // Fast fail checks
        if (!event.data?.direction === "from-page") return;
        if (!VALID_TYPES[event.data.type]) return;

        // Check message size
        if (JSON.stringify(event.data).length > MAX_CACHE_SIZE) {
            console.warn('[superenv] Message too large, skipping');
            return;
        }

        // Queue the message
        new Promise(resolve => {
            messageQueue.push({event, resolve});
            
            if (!isProcessingQueue) {
                if (frameRequest) cancelAnimationFrame(frameRequest);
                frameRequest = requestAnimationFrame(() => processMessageQueue());
            }
        }).then(response => {
            window.postMessage(response, "*");
        });
    };

    // Optimized event listener
    window.addEventListener("message", messageHandler);

    // Enhanced getEnvVars with memory protection
    async function getEnvVars() {
        const now = Date.now();
        if (envVarsCache && 
            (now - lastFetchTime) < CACHE_TTL && 
            JSON.stringify(envVarsCache).length <= MAX_CACHE_SIZE) {
            return envVarsCache;
        }

        return new Promise(resolve => {
            chrome.runtime.sendMessage({ type: "GET_ENV_VARS" }, (resp) => {
                envVarsCache = resp || {};
                lastFetchTime = now;
                resolve(envVarsCache);
            });
        });
    }
})();

// plugins/superdebug/content.js
(function() {
    const DEBUG = {
        log: (msg) => console.log(`[superdebug/content.js] ${msg}`)
    };

    // Send debug message to service worker and wait for acknowledgment
    async function sendDebugMessage(message, level, source) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: "SUPERDEBUG_LOG",
                message,
                level,
                source,
                timestamp: new Date().toISOString()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    DEBUG.log(`runtime.lastError: ${JSON.stringify(chrome.runtime.lastError)}`);
                    // Still resolve since the message was logged locally
                    resolve();
                    return;
                }
                resolve(response);
            });
        });
    }

    // Listen for debug messages from page
    window.addEventListener("message", async (event) => {
        if (!event.data || event.data.direction !== "from-page") return;
        if (event.data.type !== "SUPERDEBUG_LOG") return;

        const { message, level, source } = event.data;
        
        // Log locally first
        DEBUG.log(`Debug message: ${message} (${level})`);
        
        // Send to service worker and wait for acknowledgment
        await sendDebugMessage(message, level, source);
    });

    DEBUG.log("Debug listener initialized");
})();