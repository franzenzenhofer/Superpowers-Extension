// plugins/superwebrequest/page.js
// Minimal bridging from the real page => content => SW. 
// Exactly like superruntime, but for webRequest.

(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  let enabled = false;
  const webrequestEventListeners = {};

  function turnOn() {
    enabled = true;
    chrome.runtime.sendMessage({
      type: "SUPER_WEBREQUEST_CONTROL",
      action: "turnOn"
    });
  }

  function turnOff() {
    enabled = false;
    chrome.runtime.sendMessage({
      type: "SUPER_WEBREQUEST_CONTROL",
      action: "turnOff"
    });
  }

  window.addEventListener("message", (event) => {
    if (!enabled) return;
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
    if (!enabled) {
      return Promise.reject(new Error("Superwebrequest is not enabled"));
    }
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

  const webrequestProxy = new Proxy({ on, off, turnOn, turnOff }, {
    get: (target, prop) => {
      if (prop in target) {
        return target[prop];
      }
      return (...args) => callMethod(prop, ...args);
    }
  });

  window.Superpowers.webrequest = webrequestProxy;

  // console.log("[superwebrequest/page.js] window.Superpowers.webrequest is ready");
})();
