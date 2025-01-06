// plugins/superwebrequest/page.js
// Minimal bridging from the real page => content => SW. 
// Exactly like superruntime, but for webRequest.

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  const webrequestEventListeners = {};

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.direction !== "from-content-script") return;
    
    if (event.data.type === "SUPER_WEBREQUEST_EVENT") {
      const { eventName, args } = event.data;
      const callbacks = webrequestEventListeners[eventName] || [];
      callbacks.forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[superwebrequest/page.js] Error in event callback '${eventName}':`, err);
        }
      });
    }
  });

  function callMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script" || 
            ev.data.type !== "SUPER_WEBREQUEST_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(ev.data.error || `Error calling chrome.webRequest.${methodName}`);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: "SUPER_WEBREQUEST_CALL",
        requestId,
        methodName,
        args
      }, "*");
    });
  }

  function on(eventName, callback) {
    if (!webrequestEventListeners[eventName]) {
      webrequestEventListeners[eventName] = [];
    }
    webrequestEventListeners[eventName].push(callback);
  }

  function off(eventName, callback) {
    if (!webrequestEventListeners[eventName]) return;
    webrequestEventListeners[eventName] = webrequestEventListeners[eventName]
      .filter(fn => fn !== callback);
  }

  const webrequestProxy = new Proxy({ on, off }, {
    get: (target, prop) => {
      if (prop === "on" || prop === "off") {
        return target[prop];
      }
      return (...args) => callMethod(prop, ...args);
    }
  });

  window.Superpowers.webrequest = webrequestProxy;

  console.log("[superwebrequest/page.js] window.Superpowers.webrequest is ready");
})();
