// plugins/superaction/page.js
// Bridge from real page => content => SW for chrome.action

(function() {
  if (!window.Superpowers) window.Superpowers = {};

  const CALL_TYPE = "SUPER_ACTION_CALL";
  const RESPONSE_TYPE = "SUPER_ACTION_RESPONSE";
  const EVENT_TYPE = "SUPER_ACTION_EVENT";

  const actionEventListeners = {};

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-content-script") return;

    if (ev.data.type === EVENT_TYPE) {
      const { eventName, args } = ev.data;
      const cbs = actionEventListeners[eventName] || [];
      for (const cb of cbs) {
        try {
          cb(...args);
        } catch (err) {
          console.error("[superaction/page.js] Error in event callback:", err);
        }
      }
    } else if (ev.data.type === RESPONSE_TYPE) {
      // match requestIds if you store them
    }
  });

  function callActionMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(respEvent) {
        if (!respEvent.data || respEvent.data.direction !== "from-content-script") return;
        if (respEvent.data.type !== RESPONSE_TYPE) return;
        if (respEvent.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (respEvent.data.success) {
          resolve(respEvent.data.result);
        } else {
          reject(respEvent.data.error || `Error calling chrome.action.${methodName}`);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: CALL_TYPE,
        requestId,
        methodName,
        args
      }, "*");
    });
  }

  function on(eventName, callback) {
    if (!actionEventListeners[eventName]) {
      actionEventListeners[eventName] = [];
    }
    actionEventListeners[eventName].push(callback);
  }

  function off(eventName, callback) {
    if (!actionEventListeners[eventName]) return;
    actionEventListeners[eventName] = actionEventListeners[eventName].filter(fn => fn !== callback);
  }

  const actionProxy = new Proxy({ on, off }, {
    get: (target, prop) => {
      if (prop === "on" || prop === "off") return target[prop];
      return (...mArgs) => callActionMethod(prop, ...mArgs);
    }
  });

  window.Superpowers.action = actionProxy;
})();
