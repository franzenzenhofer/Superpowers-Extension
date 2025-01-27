// plugins/superenv/content.js
// content-script context.
// Listen for SUPERENV_GET_VARS / SUPERENV_SET_VARS / SUPERENV_PROPOSE_VARS messages -> call chrome.runtime.

(function(){
    // Memory management constants
    const MAX_QUEUE_LENGTH = 100;
    const CLEANUP_INTERVAL = 30000; // 30s
    const MAX_CACHE_SIZE = 512 * 1024; // 512KB

    console.log("[superenv/content.js] loaded in content-script context");

    let envVarsCache = null;
    let lastFetchTime = 0;
    const CACHE_TTL = 1000; // 1 second

    // Internal queue to batch requests
    const messageQueue = {
        items: [],
        push(item) {
            if (this.items.length >= MAX_QUEUE_LENGTH) {
                this.items.shift();
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

    // We'll accept these events from the page:
    // 1) SUPERENV_GET_VARS
    // 2) SUPERENV_SET_VARS (deprecated)
    // 3) SUPERENV_PROPOSE_VARS
    const VALID_TYPES = {
        SUPERENV_GET_VARS: 1,
        SUPERENV_SET_VARS: 1,
        SUPERENV_PROPOSE_VARS: 1
    };

    /**
     * Periodically clear old cache and flush the queue if idle.
     */
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

    const cleanupInterval = setInterval(performCleanup, CLEANUP_INTERVAL);

    // Clean up on window unload
    window.addEventListener('unload', () => {
        clearInterval(cleanupInterval);
        performCleanup();
    }, { once: true });

    /**
     * Main queue processor that handles up to 10 requests from the queue at once.
     */
    async function processMessageQueue() {
        if (messageQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }

        isProcessingQueue = true;
        const chunk = messageQueue.items.splice(0, 10);

        // We'll store requests by type => Map<requestId, { event, resolve }>
        const getVarsRequests = new Map();
        const setVarsRequests = new Map();
        const proposeVarsRequests = new Map();

        try {
            // Categorize each item from the chunk
            chunk.forEach(({ event, resolve }) => {
                const type = event.data?.type;
                switch (type) {
                    case 'SUPERENV_GET_VARS':
                        getVarsRequests.set(event.data.requestId, { event, resolve });
                        break;
                    case 'SUPERENV_SET_VARS':
                        setVarsRequests.set(event.data.requestId, { event, resolve });
                        break;
                    case 'SUPERENV_PROPOSE_VARS':
                        proposeVarsRequests.set(event.data.requestId, { event, resolve });
                        break;
                    default:
                        // ignore
                        break;
                }
            });

            // Handle GET_VARS
            if (getVarsRequests.size > 0) {
                const vars = await getEnvVars();
                getVarsRequests.forEach(({ event, resolve }) => {
                    resolve({
                        direction: "from-content-script",
                        type: "SUPERENV_GET_VARS_RESPONSE",
                        requestId: event.data.requestId,
                        success: true,
                        result: vars
                    });
                });
            }

            // Handle SET_VARS (deprecated)
            if (setVarsRequests.size > 0) {
                setVarsRequests.forEach(({ event, resolve }) => {
                    resolve({
                        direction: "from-content-script",
                        type: "SUPERENV_SET_VARS_RESPONSE",
                        requestId: event.data.requestId,
                        success: false,
                        result: { error: "Deprecated setEnvVars, no action" }
                    });
                });
            }

            // Handle proposeVars
            if (proposeVarsRequests.size > 0) {
                for (const [rqId, { event, resolve }] of proposeVarsRequests) {
                    const { name, description } = event.data.payload || {};
                    try {
                        const result = await proposeEnvVarInExtension(name, description);
                        resolve({
                            direction: "from-content-script",
                            type: "SUPERENV_PROPOSE_VARS_RESPONSE",
                            requestId: rqId,
                            success: true,
                            result
                        });
                    } catch (err) {
                        resolve({
                            direction: "from-content-script",
                            type: "SUPERENV_PROPOSE_VARS_RESPONSE",
                            requestId: rqId,
                            success: false,
                            error: err.message || String(err)
                        });
                    }
                }
            }

        } catch (error) {
            console.error('[superenv] Queue processing error:', error);
            // Reject all pending requests in the chunk
            [...getVarsRequests.values(), ...setVarsRequests.values(), ...proposeVarsRequests.values()]
                .forEach(({ event, resolve }) => {
                    resolve({
                        direction: "from-content-script",
                        type: `${event.data.type}_RESPONSE`,
                        requestId: event.data.requestId,
                        success: false,
                        error: "Internal queue processing error"
                    });
                });
        } finally {
            // Always clean up, regardless of success or failure
            messageQueue.items = messageQueue.items.filter(item => !chunk.includes(item));
            
            // Schedule next batch if there are more items
            if (messageQueue.length > 0) {
                frameRequest = requestAnimationFrame(() => processMessageQueue());
            } else {
                isProcessingQueue = false;
            }
        }
    }

    /**
     * Helper to propose a var by calling the extension with type="PROPOSE_ENV_VARS"
     */
    async function proposeEnvVarInExtension(name, description) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: "PROPOSE_ENV_VARS",
                name,
                description
            }, (resp) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (!resp || !resp.success) {
                    return reject(new Error(resp?.error || "Unknown error in proposeVars"));
                }
                resolve(resp);
            });
        });
    }

    /**
     * Returns the default environment from local cache if fresh, else from extension storage
     */
    async function getEnvVars() {
        const now = Date.now();
        if (envVarsCache && (now - lastFetchTime) < CACHE_TTL && JSON.stringify(envVarsCache).length <= MAX_CACHE_SIZE) {
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

    /**
     * Handler for incoming postMessage from the page
     */
    const messageHandler = (event) => {
        if (!event.data || event.data.direction !== "from-page") return;
        if (!VALID_TYPES[event.data.type]) return;

        // If the message is huge, skip
        if (JSON.stringify(event.data).length > MAX_CACHE_SIZE) {
            console.warn('[superenv] Message too large, skipping');
            return;
        }

        // Wrap the response in a promise
        new Promise(resolve => {
            messageQueue.push({ event, resolve });
            if (!isProcessingQueue) {
                if (frameRequest) cancelAnimationFrame(frameRequest);
                frameRequest = requestAnimationFrame(() => processMessageQueue());
            }
        }).then(response => {
            window.postMessage(response, "*");
        });
    };

    window.addEventListener("message", messageHandler);

})();
