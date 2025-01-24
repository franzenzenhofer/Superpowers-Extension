// plugins/superruntime/page.js
(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }

  let enabled = false;
  const runtimeEventListeners = {};

  function turnOn() {
    enabled = true;
    chrome.runtime.sendMessage({
      type: "SUPER_RUNTIME_CONTROL",
      action: "turnOn"
    });
  }

  function turnOff() {
    enabled = false;
    chrome.runtime.sendMessage({
      type: "SUPER_RUNTIME_CONTROL",
      action: "turnOff"
    });
  }

  window.addEventListener("message", (event) => {
    if (!enabled) return;
    if (!event.data || event.data.direction !== "from-content-script") return;
    
    if (event.data.type === "SUPER_RUNTIME_EVENT") {
      const { eventName, args } = event.data;
      const callbacks = runtimeEventListeners[eventName] || [];
      callbacks.forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[superruntime/page.js] Error in event callback '${eventName}':`, err);
        }
      });
    }
  });

  function callMethod(methodName, ...args) {
    if (!enabled) {
      return Promise.reject(new Error("Superruntime is not enabled"));
    }
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(ev) {
        if (!ev.data || ev.data.direction !== "from-content-script" || 
            ev.data.type !== "SUPER_RUNTIME_RESPONSE") return;
        if (ev.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (ev.data.success) {
          resolve(ev.data.result);
        } else {
          reject(new Error(ev.data.error || `Error calling chrome.runtime.${methodName}`));
        }
      }

      window.addEventListener("message", handleResponse);
      window.postMessage({
        direction: "from-page",
        type: "SUPER_RUNTIME_CALL",
        requestId,
        methodName,
        args
      }, "*");
    });
  }

  function on(eventName, callback) {
    if (!runtimeEventListeners[eventName]) {
      runtimeEventListeners[eventName] = [];
    }
    runtimeEventListeners[eventName].push(callback);
  }

  function off(eventName, callback) {
    if (!runtimeEventListeners[eventName]) return;
    runtimeEventListeners[eventName] = runtimeEventListeners[eventName]
      .filter(fn => fn !== callback);
  }

  const runtimeProxy = new Proxy({ on, off, turnOn, turnOff }, {
    get: (target, prop) => {
      if (prop === "on" || prop === "off" || prop === "turnOn" || prop === "turnOff") {
        return target[prop];
      }
      return (...args) => callMethod(prop, ...args);
    }
  });

  window.Superpowers.runtime = runtimeProxy;

})();
