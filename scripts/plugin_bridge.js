/**
 * @typedef {object} BridgeLogger
 * @property {(...args: any[]) => void} log
 * @property {(...args: any[]) => void} warn
 * @property {(...args: any[]) => void} error
 */

/**
 * Default no-op logger.
 * @type {BridgeLogger}
 */
const defaultLogger = {
    log: () => {},
    warn: () => {},
    error: () => {},
};

/**
 * Creates a bridge instance for logging.
 * @param {string} contextName - e.g., 'page', 'content', 'extension'.
 * @param {string} pluginName - The name of the plugin.
 * @param {boolean|BridgeLogger} [loggerOption=false] - Enable default console logging or provide a custom logger object.
 * @returns {BridgeLogger}
 */
function createLogger(contextName, pluginName, loggerOption = false) {
    if (loggerOption === true) {
        const prefix = `[${pluginName}/${contextName}_bridge]`;
        return {
            log: (...args) => console.log(prefix, ...args),
            warn: (...args) => console.warn(prefix, ...args),
            error: (...args) => console.error(prefix, ...args),
        };
    }
    if (typeof loggerOption === 'object' && loggerOption !== null) {
        return loggerOption; // Use custom logger
    }
    return defaultLogger; // No logging
}

/**
 * Creates a bridge on the page side for a specific plugin.
 * @param {string} pluginName - CamelCase name like 'superaction', 'supertabs'.
 * @returns {Proxy} - A proxy object mimicking the plugin's API.
 */
export function createPageBridge(pluginName) {
    const CALL_TYPE = `SUPER_${pluginName.toUpperCase()}_CALL`;
    const RESPONSE_TYPE = `SUPER_${pluginName.toUpperCase()}_RESPONSE`;
    const EVENT_TYPE = `SUPER_${pluginName.toUpperCase()}_EVENT`;

    const pendingRequests = new Map();
    const eventListeners = new Map(); // Map<eventName, Set<callback>>

    // Listen for responses and events from the content script
    window.addEventListener("message", (event) => {
        if (!event.data || event.data.direction !== "from-content-script") return;

        const { type, requestId, success, result, error, eventName, args } = event.data;

        if (type === RESPONSE_TYPE && requestId && pendingRequests.has(requestId)) {
            const { resolve, reject, timeoutId } = pendingRequests.get(requestId);
            clearTimeout(timeoutId);
            pendingRequests.delete(requestId);
            if (success) {
                resolve(result);
            } else {
                reject(new Error(error || `[${pluginName}] Unknown error`));
            }
        } else if (type === EVENT_TYPE && eventName) {
            const listeners = eventListeners.get(eventName);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(...(Array.isArray(args) ? args : []));
                    } catch (err) {
                        console.error(`[${pluginName}/page_bridge] Error in event listener for ${eventName}:`, err);
                    }
                });
            }
        }
    });

    function callMethod(methodName, ...args) {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
            const timeoutId = setTimeout(() => {
                 if (pendingRequests.has(requestId)) {
                    pendingRequests.get(requestId).reject(new Error(`[${pluginName}] Request timeout for ${methodName}`));
                    pendingRequests.delete(requestId);
                }
            }, 30000); // 30s timeout

            pendingRequests.set(requestId, { resolve, reject, timeoutId });

            window.postMessage({
                direction: "from-page",
                type: CALL_TYPE,
                requestId,
                methodName,
                args,
            }, "*");
        });
    }

    function on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error(`[${pluginName}/page_bridge] Invalid callback provided for 'on(${eventName})'`);
            return;
        }
        if (!eventListeners.has(eventName)) {
            eventListeners.set(eventName, new Set());
        }
        eventListeners.get(eventName).add(callback);
    }

    function off(eventName, callback) {
         if (typeof callback !== 'function') {
             console.error(`[${pluginName}/page_bridge] Invalid callback provided for 'off(${eventName})'`);
             return;
        }
        const listeners = eventListeners.get(eventName);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                eventListeners.delete(eventName);
            }
        }
    }

    // Return a proxy that intercepts method calls
    return new Proxy({ on, off }, {
        get: (target, prop) => {
            // 1. Handle properties defined on the target ({ on, off })
            if (prop in target) {
                return target[prop];
            }

            // 2. Prevent proxying of 'then' (for Promises/await) and 'toJSON' (for serialization/console)
            if (prop === 'then' || prop === 'toJSON') {
                return undefined;
            }

            // 3. Ignore symbols
            if (typeof prop === 'symbol') {
                return undefined;
            }

            // 4. Assume anything else is a remote method call
            if (typeof prop === 'string' && !prop.startsWith('_')) {
                 return (...args) => callMethod(prop, ...args);
            }

            // 5. Default case (shouldn't be reached often)
            return undefined;
        },
    });
}

/**
 * Creates a bridge on the content script side for a specific plugin.
 * @param {string} pluginName - CamelCase name like 'superaction', 'supertabs'.
 */
export function createContentBridge(pluginName) {
    const CALL_TYPE = `SUPER_${pluginName.toUpperCase()}_CALL`;
    const RESPONSE_TYPE = `SUPER_${pluginName.toUpperCase()}_RESPONSE`;
    const EVENT_TYPE = `SUPER_${pluginName.toUpperCase()}_EVENT`;

    // 1. Listen for calls from the page -> forward to Service Worker
    window.addEventListener("message", (event) => {
        if (!event.data || event.data.direction !== "from-page") return;
        if (event.data.type !== CALL_TYPE) return;

        const { requestId, methodName, args } = event.data;

        chrome.runtime.sendMessage({ type: CALL_TYPE, requestId, methodName, args }, (response) => {
            // Need to handle potential errors during send/receive
            const messagePayload = {
                direction: "from-content-script",
                type: RESPONSE_TYPE,
                requestId,
                success: false, // Default to false
                result: null,
                error: 'Unknown error occurred',
            };

            if (chrome.runtime.lastError) {
                messagePayload.error = `Extension communication error: ${chrome.runtime.lastError.message}`;
                 console.error(`[${pluginName}/content_bridge] Error sending/receiving message:`, chrome.runtime.lastError);
            } else if (response) {
                messagePayload.success = response.success;
                messagePayload.result = response.result;
                messagePayload.error = response.error;
            } else {
                 messagePayload.error = 'No response received from extension background.';
                 console.error(`[${pluginName}/content_bridge] No response received for ${methodName}.`);
            }

            try {
                window.postMessage(messagePayload, "*");
            } catch (postError) {
                 console.error(`[${pluginName}/content_bridge] Error posting response back to page:`, postError);
            }
        });
    });

    // 2. Listen for events from the Service Worker -> forward to Page
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === EVENT_TYPE) {
            window.postMessage({
                direction: "from-content-script",
                type: EVENT_TYPE,
                eventName: message.eventName,
                args: message.args,
            }, "*");
        }
        // Note: Unlike sendMessage, onMessage listeners don't need to return true
        // unless they intend to use sendResponse asynchronously, which we don't here.
    });

    // console.log(`[${pluginName}/content_bridge] Bridge initialized.`);
}


/**
 * Creates a bridge on the extension (Service Worker) side.
 * @param {object} config
 * @param {string} config.pluginName - CamelCase name like 'superaction'.
 * @param {Record<string, Function>} config.methodHandlers - Map where keys are method names
 *        (or a single handler name) and values are async functions `(methodName, args, sender) => result`.
 * @returns {{ broadcastEvent: (eventName: string, args: any[]) => void }} - An object with a broadcast function.
 */
export function createExtensionBridge({ pluginName, methodHandlers }) {
    const CALL_TYPE = `SUPER_${pluginName.toUpperCase()}_CALL`;
    const RESPONSE_TYPE = `SUPER_${pluginName.toUpperCase()}_RESPONSE`; // Although not used directly here, good for consistency
    const EVENT_TYPE = `SUPER_${pluginName.toUpperCase()}_EVENT`;

    if (!methodHandlers || typeof methodHandlers !== 'object' || Object.keys(methodHandlers).length === 0) {
         throw new Error(`[${pluginName}/extension_bridge] 'methodHandlers' object must be provided.`);
    }

    // Listen for calls from Content Scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type !== CALL_TYPE) return false; // Not for us

        const { methodName, args } = request;
        let handler = methodHandlers[methodName];

        // If only one handler is provided (e.g., a generic handler)
        if (!handler && Object.keys(methodHandlers).length === 1) {
             handler = Object.values(methodHandlers)[0];
        }

        if (typeof handler !== 'function') {
            console.error(`[${pluginName}/extension_bridge] No handler found for method: ${methodName}`);
            sendResponse({ success: false, error: `Unknown method: ${methodName}` });
            return false; // Indicate sync response (error)
        }

        // Execute the handler (expecting it to be async or return a Promise)
        Promise.resolve()
            // Pass methodName, args, sender, and requestId to the handler
            .then(() => handler(methodName, args || [], sender, request.requestId)) 
            .then(result => {
                sendResponse({ success: true, result });
            })
            .catch(error => {
                try { // Add protective try-catch here
                    console.error(`[${pluginName}/extension_bridge] Error executing method ${methodName}:`, error);
                    // Ensure error is always an object with a message
                    const errorMessage = (error instanceof Error) ? error.message : String(error || 'Unknown error');
                    sendResponse({ success: false, error: errorMessage });
                } catch (handlerError) {
                    // Fallback if even error handling fails
                    console.error(`[${pluginName}/extension_bridge] FATAL: Error within error handler for ${methodName}:`, handlerError);
                    sendResponse({ success: false, error: 'Internal bridge error handler failed.' });
                }
            });

        return true; // Indicate that sendResponse will be called asynchronously
    });

    // Function to broadcast events to content scripts
    function broadcastEvent(eventName, args) {
        chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
                 console.error(`[${pluginName}/extension_bridge] Error querying tabs for broadcast:`, chrome.runtime.lastError);
                return;
            }
            tabs.forEach((tab) => {
                if (tab.id && tab.id >= 0) { // Ensure tab ID is valid
                     chrome.tabs.sendMessage(tab.id, {
                        type: EVENT_TYPE,
                        eventName,
                        args: args || [], // Ensure args is an array
                    }, function(response) {
                        // Check for errors after sending message
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError;
                            // Ignore errors likely due to the content script not being injected/ready in that tab
                            if (!error.message.includes("Could not establish connection") && 
                                !error.message.includes("Receiving end does not exist")) {
                                console.warn(`[${pluginName}/extension_bridge] Error sending event '${eventName}' to tab ${tab.id}:`, error);
                            }
                        }
                    });
                }
            });
        });
    }

     // console.log(`[${pluginName}/extension_bridge] Bridge initialized.`);
    return { broadcastEvent };
} 