// initializer.js
// Defines window.Superpowers with ready/readyerror functions.
// Includes logic to merge callbacks from an optional user-defined placeholder.

(function() {
  // --- Check for and capture placeholder state ---
  // Look for a pre-existing Superpowers object that has the _isPlaceholder flag.
  const placeholder = window.Superpowers && window.Superpowers._isPlaceholder === true ? window.Superpowers : null;
  // Grab any callbacks queued by the placeholder, or initialize empty arrays if no placeholder.
  const initialReadyCallbacks = placeholder ? placeholder._readyCallbacks || [] : [];
  const initialErrorCallbacks = placeholder ? placeholder._errorCallbacks || [] : [];

  if (placeholder) {
      console.debug('[Superpowers Initializer] Placeholder found. Merging queued callbacks.', {
          readyCount: initialReadyCallbacks.length,
          errorCount: initialErrorCallbacks.length
      });
      // Optionally, nullify the placeholder to prevent accidental reuse,
      // though assigning the real object below effectively replaces it.
      // window.Superpowers = null; 
  }
  // --- End Placeholder Check ---

  // Define the REAL Superpowers object structure
  const superpowersReal = {};

  // Use Object.defineProperties for internal state, inheriting placeholder queues
  Object.defineProperties(superpowersReal, {
    '_readyCallbacks': { value: initialReadyCallbacks, writable: true, enumerable: false },
    '_errorCallbacks': { value: initialErrorCallbacks, writable: true, enumerable: false },
    '_readyStatus': {
      value: { pending: true, success: null, results: null }, // Initial state is always pending
      writable: true,
      enumerable: false
    },
    '_statusTimeoutHandle': { value: null, writable: true, enumerable: false },
    '_statusCheckInterval': { value: null, writable: true, enumerable: false },
    '_timedOut': { value: false, writable: true, enumerable: false }, // Flag to track timeout status
    // --- NEW STATE FLAGS ---
    '_backgroundReady': { value: false, writable: true, enumerable: false },
    '_pageScriptsLoaded': { value: false, writable: true, enumerable: false }
    // --- End NEW STATE FLAGS ---
  });

  // Assign the real object to the window, replacing the placeholder if it existed
  window.Superpowers = superpowersReal;

  // --- Define REAL ready function ---
  window.Superpowers.ready = function(callback) {
    if (typeof callback !== 'function') {
      console.error('[Superpowers] ready() requires a function callback');
      return;
    }
    // If status already resolved...
    if (!window.Superpowers._readyStatus.pending) {
      if (window.Superpowers._readyStatus.success) {
        // Execute immediately (asynchronously)
        setTimeout(callback, 0);
      }
      // If already failed, do nothing for .ready()
    } else {
      // Status pending - add to queue
      window.Superpowers._readyCallbacks.push(callback);
    }
  };

  // --- Define REAL readyerror function ---
  window.Superpowers.readyerror = function(callback) {
    if (typeof callback !== 'function') {
      console.error('[Superpowers] readyerror() requires a function callback');
      return;
    }
    // If status already resolved...
    if (!window.Superpowers._readyStatus.pending) {
      if (!window.Superpowers._readyStatus.success) {
        // Prepare error details
        const errorDetails = [];
        if (window.Superpowers._readyStatus.results) {
          // Collect errors from failed plugins
          for (const [name, info] of window.Superpowers._readyStatus.results) {
            if (!info.active) {
              errorDetails.push({ name, error: info.error || 'Unknown Error' });
            }
          }
        }
        // Add timeout error specifically if that was the cause
        if (window.Superpowers._timedOut && errorDetails.length === 0) {
             errorDetails.push({ name: 'Initialization Timeout', error: 'Superpowers did not report status within the time limit.' });
        }
        // If no specific plugin errors or timeout, add a generic failure message
        if(errorDetails.length === 0){
             errorDetails.push({ name: 'Initialization Failed', error: 'Unknown initialization error occurred.' });
        }

        // Execute immediately (asynchronously)
        setTimeout(() => callback(errorDetails), 0);
      }
      // If already succeeded, do nothing for .readyerror()
    } else {
      // Status pending - add to queue
      window.Superpowers._errorCallbacks.push(callback);
    }
  };

  // --- NEW: Function to check readiness and execute callbacks ---
  function checkAndExecuteReadyCallbacks() {
    // Only proceed if *both* background is ready AND page scripts are loaded AND status is still pending
    if (window.Superpowers._backgroundReady && window.Superpowers._pageScriptsLoaded && window.Superpowers._readyStatus.pending) {
      console.debug('[Superpowers Initializer] Both background and page scripts ready. Executing ready callbacks.');

      // Mark as resolved successfully (assuming background reported success)
      window.Superpowers._readyStatus.pending = false;
      window.Superpowers._readyStatus.success = true; // Note: Assumes background was successful

      // Clear timeout/interval
      if (window.Superpowers._statusTimeoutHandle) {
        clearTimeout(window.Superpowers._statusTimeoutHandle);
        window.Superpowers._statusTimeoutHandle = null;
      }
      if (window.Superpowers._statusCheckInterval) {
        clearInterval(window.Superpowers._statusCheckInterval);
        window.Superpowers._statusCheckInterval = null;
      }

      // Execute Ready Callbacks
      const callbacksToRun = window.Superpowers._readyCallbacks.slice();
      window.Superpowers._readyCallbacks = [];
      window.Superpowers._errorCallbacks = []; // Clear error queue too
      callbacksToRun.forEach(cb => setTimeout(cb, 0));

      // Clean up listeners for status messages
      window.removeEventListener('message', handleSuperpowersStatus);
      window.removeEventListener('message', handlePageScriptsLoaded);
    }
  }

  // --- MODIFIED Status Handling Logic ---
  function handleSuperpowersStatus(event) {
    // Basic validation of the message source and structure
    if (event.source !== window || !event.data || event.data.direction !== 'from-content-script' || event.data.type !== 'SUPERPOWERS_STATUS') {
      return;
    }

    // Prevent processing if status is no longer pending (e.g., due to timeout)
    if (!window.Superpowers._readyStatus.pending) {
      console.warn('[Superpowers Initializer] Received status update, but initialization already resolved (possibly timed out). Ignoring.');
      return;
    }

    console.debug('[Superpowers Initializer] Received REAL status from extension:', event.data.payload);

    // Update the internal status BUT DON'T execute callbacks yet
    window.Superpowers._readyStatus.success = event.data.payload.success;

    // Reconstruct the results Map
    if (event.data.payload.results && typeof event.data.payload.results === 'object') {
      try {
        window.Superpowers._readyStatus.results = new Map(Object.entries(event.data.payload.results));
      } catch (e) {
        console.error('[Superpowers Initializer] Failed to reconstruct results Map:', e);
        window.Superpowers._readyStatus.results = new Map(); // Fallback to empty map
      }
    } else {
      window.Superpowers._readyStatus.results = new Map(); // Ensure it's always a Map
    }

    if (!window.Superpowers._readyStatus.success) {
      // --- HANDLE FAILURE IMMEDIATELY ---
      console.error('[Superpowers Initializer] Background reported FAILURE. Executing error callbacks.');
      window.Superpowers._readyStatus.pending = false; // Mark as resolved (failed)

      // Clear timeout/interval
      if (window.Superpowers._statusTimeoutHandle) {
        clearTimeout(window.Superpowers._statusTimeoutHandle);
        window.Superpowers._statusTimeoutHandle = null;
      }
      if (window.Superpowers._statusCheckInterval) {
        clearInterval(window.Superpowers._statusCheckInterval);
        window.Superpowers._statusCheckInterval = null;
      }

      // Prepare error details
      const errorDetails = [];
      if (window.Superpowers._readyStatus.results) {
        for (const [name, info] of window.Superpowers._readyStatus.results) {
          if (!info.active) {
            errorDetails.push({ name, error: info.error || 'Unknown Error' });
          }
        }
      }
      if(errorDetails.length === 0){
        errorDetails.push({ name: 'Initialization Failed', error: 'Background initialization reported failure.' });
      }

      // Execute Error Callbacks
      const errorCallbacksToRun = window.Superpowers._errorCallbacks.slice();
      window.Superpowers._errorCallbacks = [];
      window.Superpowers._readyCallbacks = []; // Clear ready queue too
      errorCallbacksToRun.forEach(cb => setTimeout(() => cb(errorDetails), 0));

      // Cleanup listeners
      window.removeEventListener('message', handleSuperpowersStatus);
      window.removeEventListener('message', handlePageScriptsLoaded);
    } else {
      // --- Background is READY, set flag and check if page scripts are also ready ---
      console.debug('[Superpowers Initializer] Background reported READY. Waiting for page scripts signal...');
      window.Superpowers._backgroundReady = true;
      checkAndExecuteReadyCallbacks(); // Check if we can proceed
    }
  }
  window.addEventListener('message', handleSuperpowersStatus);

  // --- NEW: Listener for Page Scripts Loaded Signal ---
  function handlePageScriptsLoaded(event) {
    if (event.source !== window || !event.data || event.data.type !== '__SUPERPOWERS_PAGE_SCRIPTS_LOADED__') {
      return;
    }
    
    if (!window.Superpowers._readyStatus.pending) {
      return; // Already resolved
    }

    console.debug('[Superpowers Initializer] Received page scripts loaded signal from content script.');
    window.Superpowers._pageScriptsLoaded = true;
    checkAndExecuteReadyCallbacks(); // Check if we can proceed
  }
  window.addEventListener('message', handlePageScriptsLoaded);

  // --- Active Status Requesting Logic ---
  function requestInitializationStatus() {
    console.debug('[Superpowers Initializer] Requesting initialization status from background...');

    // Temporary handler specifically for the response to *this* request
    function tempHandler(event) {
      if (event.source !== window || !event.data || event.data.direction !== 'from-content-script' || event.data.type !== 'INITIALIZATION_STATUS_RESPONSE') {
        return;
      }

      console.debug('[Superpowers Initializer] Received status response:', event.data.payload);
      window.removeEventListener('message', tempHandler); // Clean up this specific listener

      // If the status is complete, forward it to the main handler
      if (event.data.payload?.status === 'complete' && event.data.payload.payload) {
        // Construct an event object similar to the direct SUPERPOWERS_STATUS message
        const statusEvent = {
          source: window,
          data: {
            direction: 'from-content-script',
            type: 'SUPERPOWERS_STATUS',
            payload: event.data.payload.payload // This contains { success, results }
          }
        };
        // Process it using the main handler
        handleSuperpowersStatus(statusEvent);
      } else if (event.data.payload?.status === 'error') {
         console.error('[Superpowers Initializer] Background reported error getting status:', event.data.payload.error);
         // Potentially trigger readyerror here if needed, although timeout might cover it
      } else {
         console.debug('[Superpowers Initializer] Background status is still pending.');
      }
    }

    window.addEventListener('message', tempHandler);

    // Send request to content script to forward to service worker
    window.postMessage({
      direction: 'to-content-script',
      type: 'GET_INITIALIZATION_STATUS'
    }, '*');

    // Timeout for cleaning up the temporary listener if no response comes
    setTimeout(() => {
      window.removeEventListener('message', tempHandler);
    }, 3000); // 3-second timeout for this specific response
  }

  // Request status immediately on load
  requestInitializationStatus();

  // Setup polling interval (cleared by handleSuperpowersStatus or timeout)
  window.Superpowers._statusCheckInterval = setInterval(() => {
    // Only request if still pending
    if (window.Superpowers._readyStatus.pending) {
      requestInitializationStatus();
    } else {
      // Status resolved, clear interval
      if(window.Superpowers._statusCheckInterval) {
         clearInterval(window.Superpowers._statusCheckInterval);
         window.Superpowers._statusCheckInterval = null;
      }
    }
  }, 5000); // Check every 5 seconds

  // --- Initialization Timeout Logic ---
  const TIMEOUT_MS = 15000; // 15 seconds total wait time
  window.Superpowers._statusTimeoutHandle = setTimeout(function() {
    // Only act if initialization is still pending
    if (window.Superpowers._readyStatus.pending) {
      console.error(`[Superpowers Initializer] Initialization status timed out after ${TIMEOUT_MS / 1000} seconds.`);
      window.Superpowers._timedOut = true; // Set timeout flag

      // --- Trigger FAILURE flow ---
      window.Superpowers._readyStatus.pending = false;
      window.Superpowers._readyStatus.success = false;
      window.Superpowers._readyStatus.results = null;

      // Clear interval
      if (window.Superpowers._statusCheckInterval) {
        clearInterval(window.Superpowers._statusCheckInterval);
        window.Superpowers._statusCheckInterval = null;
      }

      const timeoutError = [{ name: 'Initialization Timeout', error: 'Superpowers did not report status within the time limit.' }];

      // Execute Error Callbacks
      const errorCallbacksToRun = window.Superpowers._errorCallbacks.slice();
      window.Superpowers._errorCallbacks = [];
      window.Superpowers._readyCallbacks = [];
      errorCallbacksToRun.forEach(cb => setTimeout(() => cb(timeoutError), 0));

      // Cleanup Listeners
      window.removeEventListener('message', handleSuperpowersStatus);
      window.removeEventListener('message', handlePageScriptsLoaded);
    }
  }, TIMEOUT_MS);

  console.debug('[Superpowers Initializer] REAL initializer script loaded.');

})(); // End IIFE