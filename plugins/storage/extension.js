// plugins/superstorage/extension.js
// Service worker logic to handle chrome.storage calls and broadcast events.

export const storage_extension = {
    name: "storage_extension",

    install(context) {
        try {
            setupMessageHandlers();
            setupStorageEvents();
        } catch (err) {
            console.error('[superstorage_extension] Installation error:', err);
        }
    }
};

function setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type !== "SUPER_STORAGE_CALL") return false;

        const { requestId, methodName, args } = request;
        
        handleStorageCall(methodName, args)
            .then(result => sendResponse({ success: true, result }))
            .catch(err => sendResponse({ success: false, error: err.message || String(err) }));

        return true; // Keep channel open for async response
    });
}

function setupStorageEvents() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        broadcastStorageEvent("onChanged", [changes, areaName]);
    });
}

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

function broadcastStorageEvent(eventName, eventArgs) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id >= 0) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "SUPER_STORAGE_EVENT",
                    eventName,
                    args: eventArgs
                }).catch(() => {
                    // Ignore errors for inactive tabs
                });
            }
        });
    });
}
