(function() {
  if (!window.Superpowers) window.Superpowers = {};
  if (!window.Superpowers.Urlget) window.Superpowers.Urlget = {};

  const urlgetEventListeners = {};

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-content-script") return;
    
    if (event.data.type === "SUPERURLGET_EVENT") {
      const { eventName, args } = event.data;
      const callbacks = urlgetEventListeners[eventName] || [];
      callbacks.forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[superurlget/page.js] Error in event callback '${eventName}':`, err);
        }
      });
    }
  });

  function callMethod(methodName, url, config = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script" || 
            ev.data.type !== "SUPERURLGET_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(new Error(ev.data.error || `Error in ${methodName}`));
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: "SUPERURLGET_CALL",
        requestId,
        methodName,
        url,
        config
      }, "*");
    });
  }

  // Update to use the capitalized namespace:
  window.Superpowers.Urlget = {
    getRenderedPage: (url, config) => callMethod('getRenderedPage', url, config),
    getHtml: (url, config) => callMethod('getHtml', url, config),
    getDom: (url, config) => callMethod('getDom', url, config),
    getText: (url, config) => callMethod('getText', url, config)
  };

})();
