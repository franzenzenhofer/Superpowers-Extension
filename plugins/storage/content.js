// plugins/storage/content.js
// Receives messages from the page (page.js) and forwards them to the
// extension service worker, then relays the responses back to the page.

(function() {
    let isInitialized = false;

    function init() {
        if (isInitialized) return;
        
        try {
            setupMessageHandlers();
            isInitialized = true;
        } catch (err) {
            console.error('[storage/content.js] Initialization error:', err);
        }
    }

    function setupMessageHandlers() {
        // Handle page -> extension messages
        window.addEventListener("message", (event) => {
            if (!event.data || event.data.direction !== "from-page") return;
            if (event.data.type !== "SUPER_STORAGE_CALL") return;

            const { requestId, methodName, args } = event.data;

            // Safely forward to extension
            try {
                chrome.runtime.sendMessage(
                    {
                        type: "SUPER_STORAGE_CALL",
                        requestId,
                        methodName,
                        args
                    },
                    (response) => {
                        // Handle potential disconnection
                        if (chrome.runtime.lastError) {
                            sendResponseToPage(requestId, false, null, 
                                "Extension communication error: " + chrome.runtime.lastError.message);
                            return;
                        }
                        sendResponseToPage(requestId, response?.success, response?.result, response?.error);
                    }
                );
            } catch (err) {
                sendResponseToPage(requestId, false, null, "Failed to send message to extension: " + err.message);
            }
        });

        // Handle extension -> page messages (events)
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === "SUPER_STORAGE_EVENT") {
                window.postMessage({
                    direction: "from-content-script",
                    type: "SUPER_STORAGE_EVENT",
                    eventName: message.eventName,
                    args: message.args
                }, "*");
            }
        });
    }

    function sendResponseToPage(requestId, success, result, error) {
        try {
            window.postMessage({
                direction: "from-content-script",
                type: "SUPER_STORAGE_RESPONSE",
                requestId,
                success,
                result,
                error
            }, "*");
        } catch (err) {
            console.error('[storage/content.js] Failed to send response to page:', err);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
