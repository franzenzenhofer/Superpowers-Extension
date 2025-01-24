(function() {
  // console.debug('[ga/page] Initializing GA page script');
  
  if (!window.Superpowers) {
    // console.debug('[ga/page] Creating Superpowers namespace');
    window.Superpowers = {};
  }
  if (!window.Superpowers.Ga) {
    // console.debug('[ga/page] Creating Superpowers.Ga namespace');
    window.Superpowers.Ga = {};
  }

  const CALL_TYPE = "GA_CALL";
  const RESPONSE_TYPE = "GA_RESPONSE";

  function callGaMethod(methodName, ...args) {
    // console.log('🔄 [FLOW] 3. Page script (GA): calling method:', { methodName, args });
    
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      // console.log('🔄 [FLOW] 4. Page script (GA): generated requestId:', requestId);

      function handleResponse(ev) {
        // console.log('🔄 [FLOW] 8. Page script (GA): received response from content script:', ev.data);
        
        if (!ev.data || ev.data.direction !== "from-content-script") {
          // Not from our content script, ignore
          return;
        }
        if (ev.data.type !== RESPONSE_TYPE) {
          // Not our GA response type
          return;
        }
        if (ev.data.requestId !== requestId) {
          // Mismatched request
          return;
        }

        // Clean up listener
        window.removeEventListener("message", handleResponse);

        if (ev.data.success) {
          // console.log('✅ [FLOW] Page script (GA): successful response:', ev.data.result);
          resolve(ev.data.result);
        } else {
          console.error('❌ [FLOW] Page script (GA): error response:', ev.data.error);
          reject(new Error(ev.data.error || "[ga] Unknown error"));
        }
      }

      // console.debug('[ga/page] Adding message listener for requestId:', requestId);
      window.addEventListener("message", handleResponse);

      const message = {
        direction: "from-page",
        type: CALL_TYPE,
        requestId,
        methodName,
        args
      };
      
      // console.log('🔄 [FLOW] 5. Page script (GA): posting message to content script:', message);
      window.postMessage(message, "*");
    });
  }

  // Create wrapper
  const methodWrapper = (methodName) => (...args) => {
    // console.debug(`[ga/page] Calling method ${methodName}:`, { args });
    return callGaMethod(methodName, ...args)
      .then(result => {
        // console.debug(`[ga/page] ${methodName} returned:`, result);
        return result;
      })
      .catch(error => {
        console.error(`[ga/page] ${methodName} failed:`, error);
        throw error;
      });
  };

  // Expose public API
  window.Superpowers.Ga = {
    login: methodWrapper('login'),
    getLoginStatus: methodWrapper('getLoginStatus'),
    test: methodWrapper('test'),


    // Admin new calls
    listAccounts: methodWrapper("listAccounts"),
    listAccountSummaries: methodWrapper("listAccountSummaries"),
    listProperties: methodWrapper("listProperties"),


    // GA core
    runReport: methodWrapper('runReport'),
    runPivotReport: methodWrapper('runPivotReport'),
    batchRunReports: methodWrapper('batchRunReports'),
    batchRunPivotReports: methodWrapper('batchRunPivotReports'),
    runRealtimeReport: methodWrapper('runRealtimeReport'),
    getMetadata: methodWrapper('getMetadata'),
    checkCompatibility: methodWrapper('checkCompatibility'),

    // Audience exports (example calls)
    createAudienceExport: methodWrapper('createAudienceExport'),
    getAudienceExport: methodWrapper('getAudienceExport'),
    queryAudienceExport: methodWrapper('queryAudienceExport'),
    listAudienceExports: methodWrapper('listAudienceExports')
  };

  // console.debug('[ga/page] GA page script initialization complete', {
  //   availableMethods: Object.keys(window.Superpowers.Ga)
  // });
})();
