// plugins/superaction/extension.js
import { createExtensionBridge } from '../../scripts/plugin_bridge.js';

/**
 * Handles calls to chrome.action methods.
 * @param {string} methodName - The name of the chrome.action method.
 * @param {any[]} args - Arguments for the method.
 * @param {chrome.runtime.MessageSender} sender - The sender of the message.
 * @returns {Promise<any>} - The result of the API call.
 */
async function handleActionMethod(methodName, args = [], sender) {
    // Basic security check: ensure methodName is a valid chrome.action method
    const validMethods = ['setIcon', 'setTitle', 'setBadgeText', 'setBadgeBackgroundColor', 'enable', 'disable', 'getBadgeText', 'getBadgeBackgroundColor', 'getTitle', 'getPopup', 'getUserSettings', 'openPopup'];
    if (!validMethods.includes(methodName)) {
        throw new Error(`Invalid or unsupported chrome.action method: ${methodName}`);
    }

    if (typeof chrome.action[methodName] !== 'function') {
        throw new Error(`chrome.action.${methodName} is not a function.`);
    }

    // Special handling for methods that require a tabId context (like enable/disable)
    // We'll use the sender's tab ID if available and appropriate for the method.
    // Note: Not all methods accept a tabId object as the first arg. Adjust as needed.
    // Example: chrome.action.enable(tabId, callback) vs chrome.action.setBadgeText({text: '...', tabId: ...}, callback)
    // For simplicity here, we assume args are passed correctly from the page for methods needing tabId.
    // More robust handling might involve checking methodName and adjusting args structure.

    // console.log(`[superaction/extension] Executing: chrome.action.${methodName}(${JSON.stringify(args)})`);

    // Use a promise wrapper to handle both promise-based and callback-based chrome API methods
    return new Promise((resolve, reject) => {
        try {
            // Append the callback function for APIs that still use it
            const callback = (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            };

            // Attempt to call the method. Spread args correctly.
            const potentialPromise = chrome.action[methodName](...args, callback);

            // Check if the API returned a promise (newer Manifest V3 style)
            if (potentialPromise && typeof potentialPromise.then === 'function') {
                potentialPromise.then(resolve).catch(reject);
            }
            // If not a promise, the callback above will handle resolution/rejection.

        } catch (error) {
            console.error(`[superaction/extension] Error calling chrome.action.${methodName}:`, error);
            reject(error);
        }
    });
}

export const superaction_extension = {
    name: "superaction_extension",

    install(context) {
        // Create the bridge, passing the handler function
        // The bridge will listen for 'SUPER_ACTION_CALL' messages
        const bridge = createExtensionBridge({
            pluginName: 'superaction',
            methodHandlers: {
                // Since we have one handler function that uses the methodName,
                // we can potentially simplify this map if the bridge supports it,
                // otherwise, map each potential method explicitly if needed.
                // For now, assume the bridge calls the handler with the method name.
                 setIcon: handleActionMethod,
                 setTitle: handleActionMethod,
                 setBadgeText: handleActionMethod,
                 setBadgeBackgroundColor: handleActionMethod,
                 enable: handleActionMethod,
                 disable: handleActionMethod,
                 getBadgeText: handleActionMethod,
                 getBadgeBackgroundColor: handleActionMethod,
                 getTitle: handleActionMethod,
                 getPopup: handleActionMethod,
                 getUserSettings: handleActionMethod,
                 openPopup: handleActionMethod,
                // Add other methods as needed
            }
        });

        // Set up the chrome.action event listener and use the broadcast function
        chrome.action.onClicked.addListener((tab) => {
            // console.log('[superaction/extension] Action clicked, broadcasting event...');
            // Broadcast the 'onClicked' event with the tab argument
            bridge.broadcastEvent('onClicked', [tab]);
        });

        if (context.debug) {
            // console.log("[superaction/extension] Bridge initialized and event listeners set up.");
        }
    }
};
