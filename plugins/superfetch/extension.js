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

        // Process the response - with DUAL-TRANSFER APPROACH
        // We'll get both the ArrayBuffer and the text directly
        let arrayBuffer = null;
        let textData = '';
        
        // Clone the response for multiple reads
        const responseForBuffer = response.clone();
        const responseForText = response.clone();
        
        // Try to get the raw ArrayBuffer
        try {
            arrayBuffer = await responseForBuffer.arrayBuffer();
            console.debug(`[superfetch/extension] Successfully read arrayBuffer for ${url}, size: ${arrayBuffer.byteLength} bytes`);
        } catch (bufferError) {
            console.warn(`[superfetch/extension] Failed to read response as ArrayBuffer: ${bufferError.message}`);
            arrayBuffer = null;
        }
        
        // Also try to get the text directly
        try {
            textData = await responseForText.text();
            console.debug(`[superfetch/extension] Successfully read text for ${url}, length: ${textData.length} chars`);
        } catch (textError) {
            console.warn(`[superfetch/extension] Failed to read response as text directly: ${textError.message}`);
            
            // If we have arrayBuffer but failed to get text directly, try to decode from buffer
            if (arrayBuffer) {
                try {
                    textData = new TextDecoder("utf-8").decode(arrayBuffer);
                    console.debug(`[superfetch/extension] Successfully decoded text from arrayBuffer for ${url}`);
                } catch (decodeError) {
                    console.warn(`[superfetch/extension] Failed to decode ArrayBuffer to text: ${decodeError.message}`);
                }
            }
        }
        
        // At this point we should have at least one of: arrayBuffer or textData
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
            body: textData, // Use the directly obtained text (renamed from fallbackText)
            textData: textData, // NEW: Send pre-decoded text
            redirected: response.redirected,
            url: response.url, // Final URL after redirects
            type: response.type, // e.g., 'basic', 'cors'
            headers: headerObj,
            rawData: arrayBuffer, // Send ArrayBuffer directly (may be null)
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
