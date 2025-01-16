(function() {
  console.debug('[gsc/page] Initializing GSC page script');
  
  if (!window.Superpowers) {
    console.debug('[gsc/page] Creating Superpowers namespace');
    window.Superpowers = {};
  }
  if (!window.Superpowers.Gsc) {
    console.debug('[gsc/page] Creating Superpowers.Gsc namespace');
    window.Superpowers.Gsc = {};
  }

  const CALL_TYPE = "GSC_CALL";
  const RESPONSE_TYPE = "GSC_RESPONSE";

  function callGscMethod(methodName, ...args) {
    console.log('🔄 [FLOW] 3. Page script: calling GSC method:', { methodName, args });
    
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);
      console.log('🔄 [FLOW] 4. Page script: generated requestId:', requestId);

      function handleResponse(ev) {
        console.log('🔄 [FLOW] 8. Page script: received response from content script:', ev.data);
        
        if (!ev.data || ev.data.direction !== "from-content-script") {
          console.debug('[page] Ignoring non-content-script message:', ev);
          return;
        }
        if (ev.data.type !== RESPONSE_TYPE) {
          console.debug('[gsc/page] Ignoring non-response message type:', ev.data.type);
          return;
        }
        if (ev.data.requestId !== requestId) {
          console.debug('[gsc/page] Ignoring message with different requestId:', 
            { received: ev.data.requestId, expected: requestId });
          return;
        }

        console.debug('[gsc/page] Processing matching response:', ev.data);
        window.removeEventListener("message", handleResponse);

        if (ev.data.success) {
          console.log('✅ [FLOW] Page script: successful response:', ev.data.result);
          resolve(ev.data.result);
        } else {
          console.error('❌ [FLOW] Page script: error response:', ev.data.error);
          reject(new Error(ev.data.error || "[gsc] Unknown error"));
        }
      }

      console.debug('[gsc/page] Adding message listener for requestId:', requestId);
      window.addEventListener("message", handleResponse);

      const message = {
        direction: "from-page",
        type: CALL_TYPE,
        requestId,
        methodName,
        args
      };
      
      console.log('🔄 [FLOW] 5. Page script: posting message to content script:', message);
      window.postMessage(message, "*");
    });
  }

  // Wrap each method call with debug logging
  const methodWrapper = (methodName) => (...args) => {
    console.debug(`[gsc/page] Calling method ${methodName}:`, { args });
    return callGscMethod(methodName, ...args)
      .then(result => {
        console.debug(`[gsc/page] ${methodName} returned:`, result);
        return result;
      })
      .catch(error => {
        console.error(`[gsc/page] ${methodName} failed:`, error);
        throw error;
      });
  };

  // Attach public API to Superpowers.Gsc
  console.debug('[gsc/page] Setting up public API methods');
  window.Superpowers.Gsc = {
    login: methodWrapper('login'),
    getLoginStatus: methodWrapper('getLoginStatus'),
    test: methodWrapper('test'),
    
    // core
    listSites: methodWrapper('listSites'),
    getSiteInfo: methodWrapper('getSiteInfo'),
    querySearchAnalytics: methodWrapper('querySearchAnalytics'),
    submitSitemap: methodWrapper('submitSitemap'),
    deleteSitemap: methodWrapper('deleteSitemap'),
    listSitemaps: methodWrapper('listSitemaps'),
    
    // sugar
    getTopQueries: methodWrapper('getTopQueries'),
    getTopPages: methodWrapper('getTopPages'),
    
    // advanced analytics
    getDetailedAnalytics: methodWrapper('getDetailedAnalytics'),
    getTopPagesDetailed: methodWrapper('getTopPagesDetailed'),
    getQueryAnalyticsByPage: methodWrapper('getQueryAnalyticsByPage'),
    getDeviceAnalytics: methodWrapper('getDeviceAnalytics'),
    getCountryAnalytics: methodWrapper('getCountryAnalytics')
  };

  console.debug('[gsc/page] GSC page script initialization complete', {
    availableMethods: Object.keys(window.Superpowers.Gsc)
  });
})();
