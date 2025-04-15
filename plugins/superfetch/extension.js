// plugins/superfetch/extension.js
// Service worker logic to handle fetch requests across domains.

import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

// Default timeout for the actual fetch operation in milliseconds
const DEFAULT_FETCH_TIMEOUT_MS = 120000; // 2 minutes

// Store the current timeout value (could be made configurable via messages later)
let currentFetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS;

/**
 * Main fetch logic handler for the bridge.
 * Executes fetch in the service worker context.
 * @param {string} methodName - Should be 'fetch'.
 * @param {any[]} args - Array containing [url, options].
 * @param {chrome.runtime.MessageSender} sender - Info about the sender.
 * @returns {Promise<object>} - A promise resolving to the response data object.
 */
async function handleSuperfetchBridge(methodName, args, sender) {
    if (methodName !== 'fetch') {
        throw new Error(`Unsupported method: ${methodName}`);
    }

    const [url, options = {}] = args;

    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
    }

    console.debug(`[superfetch/extension] Handling fetch for: ${url}`, options);

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[superfetch/extension] Fetch timeout triggered for ${url} after ${currentFetchTimeoutMs}ms`);
        controller.abort();
    }, currentFetchTimeoutMs);

    try {
        const fetchOptions = {
            method: options.method || "GET",
            headers: options.headers || {},
            body: options.body, // Pass body directly (string, FormData, Blob, etc.)
            redirect: options.redirect || "follow", // Standard fetch default
            mode: options.mode || "cors", // Usually 'cors' or 'no-cors'
            credentials: options.credentials || "same-origin",
            cache: options.cache, // e.g., 'default', 'no-store'
            referrerPolicy: options.referrerPolicy,
            signal: controller.signal, // Add signal for timeout
            // Add other relevant options if needed (referrer, integrity, keepalive)
            ...(options.referrer && { referrer: options.referrer }),
            ...(options.integrity && { integrity: options.integrity }),
            ...(options.keepalive && { keepalive: options.keepalive }),
        };

        // Perform the fetch
        const response = await fetch(url, fetchOptions);

        // Clear the timeout timer as fetch completed
        clearTimeout(timeoutId);

        // Process the response
        const arrayBuffer = await response.arrayBuffer();
        
        // Also read text for backward compatibility
        const fallbackText = new TextDecoder("utf-8").decode(arrayBuffer);

        // Convert Headers object to a plain key-value object (lowercase keys)
        const headerObj = {};
        response.headers.forEach((value, key) => {
            headerObj[key.toLowerCase()] = value;
        });

        console.debug(`[superfetch/extension] Fetch successful for ${url}. Status: ${response.status}`);

        // Return data structure expected by the page script
        return {
            success: true, // Indicate overall success (fetch didn't throw)
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            body: fallbackText, // For backward compatibility  
            redirected: response.redirected,
            url: response.url, // Final URL after redirects
            type: response.type, // e.g., 'basic', 'cors'
            headers: headerObj,
            rawData: arrayBuffer, // Send ArrayBuffer directly
            // Include timestamp and original requestId if needed for debugging on page
            timestamp: Date.now(),
        };

    } catch (error) {
        // Clear timeout if fetch failed
        clearTimeout(timeoutId);
        console.error(`[superfetch/extension] Fetch error for ${url}:`, error);

        // Handle AbortError specifically for timeout
        if (error.name === 'AbortError') {
            throw new Error(`Fetch timed out after ${currentFetchTimeoutMs / 1000}s`);
        }
        // Rethrow other errors
        throw new Error(error.message || String(error));
    }
}

// --- Initialize the Extension Bridge ---
export const superfetch_extension = {
    name: "superfetch_extension",

    install(context) {
        console.debug("[superfetch/extension] Installing...");

        createExtensionBridge({
            pluginName: 'superfetch',
            methodHandlers: {
                // Register the handler for the 'fetch' method
                fetch: handleSuperfetchBridge
            }
        });

        console.debug("[superfetch/extension] Bridge initialized.");
    }
};
