// plugins/storage/extension.js
// Service worker logic to handle chrome.storage calls and broadcast events.

import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

export const storage_extension = {
    name: "storage_extension",

    install(context) {
        try {
            // Create the extension bridge with a handler for all storage methods
            const { broadcastEvent } = createExtensionBridge({
                pluginName: 'storage',
                methodHandlers: {
                    // Handler for all storage methods
                    handler: (methodName, args, sender) => {
                        return handleStorageCall(methodName, args);
                    }
                }
            });

            // Setup storage event listener
            chrome.storage.onChanged.addListener((changes, areaName) => {
                broadcastEvent("onChanged", [changes, areaName]);
            });
        } catch (err) {
            console.error('[storage_extension] Installation error:', err);
        }
    }
};

async function handleStorageCall(methodName, args = []) {
    const [area, method] = methodName.split('.');
    
    if (!area || !method || !chrome.storage[area]) {
        throw new Error(`Invalid storage call: ${methodName}`);
    }

    const storageArea = chrome.storage[area];
    if (typeof storageArea[method] !== 'function') {
        throw new Error(`Unknown storage method: ${method}`);
    }

    try {
        // Handle both Promise and callback-based APIs
        const result = await callStorageMethod(storageArea, method, args);
        return result;
    } catch (err) {
        throw new Error(`Storage operation failed: ${err.message}`);
    }
}

function callStorageMethod(storageArea, method, args) {
    return new Promise((resolve, reject) => {
        try {
            // Try Promise-based API first (Manifest V3)
            const maybePromise = storageArea[method](...args);
            if (maybePromise && typeof maybePromise.then === 'function') {
                return maybePromise.then(resolve).catch(reject);
            }

            // Fallback to callback-based API
            storageArea[method](...args, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
