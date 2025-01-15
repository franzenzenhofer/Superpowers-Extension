// plugins/superwebnavigation/page.js
// Bridge from real page => content => SW for chrome.webNavigation.

(function () {
  if (!window.Superpowers) window.Superpowers = {};

  const PLUGIN_EVENT_TYPE = "SUPER_WEBNAVIGATION_EVENT";
  const PLUGIN_RESPONSE_TYPE = "SUPER_WEBNAVIGATION_RESPONSE";
  const PLUGIN_CALL_TYPE = "SUPER_WEBNAVIGATION_CALL";

  const eventListeners = {};

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-content-script") return;
    if (ev.data.type === PLUGIN_EVENT_TYPE) {
      const { eventName, args } = ev.data;
      const cbs = eventListeners[eventName] || [];
      for (const cb of cbs) {
        try {
          cb(...args);
        } catch (err) {
          console.error("[superwebnavigation/page.js] Error in event callback:", err);
        }
      }
    } else if (ev.data.type === PLUGIN_RESPONSE_TYPE) {
      // You could match requestId if desired
    }
  });

  function callWebNavMethod(methodName, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).slice(2);

      function handleResponse(respEvent) {
        if (!respEvent.data || respEvent.data.direction !== "from-content-script") return;
        if (respEvent.data.type !== PLUGIN_RESPONSE_TYPE) return;
        if (respEvent.data.requestId !== requestId) return;

        window.removeEventListener("message", handleResponse);
        if (respEvent.data.success) {
          resolve(respEvent.data.result);
        } else {
          reject(respEvent.data.error || `Error calling chrome.webNavigation.${methodName}`);
        }
      }

      window.addEventListener("message", handleResponse);

      window.postMessage({
        direction: "from-page",
        type: PLUGIN_CALL_TYPE,
        requestId,
        methodName,
        args
      }, "*");
    });
  }

  function on(eventName, callback) {
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(callback);
  }

  function off(eventName, callback) {
    if (!eventListeners[eventName]) return;
    eventListeners[eventName] = eventListeners[eventName].filter(fn => fn !== callback);
  }

  const webNavProxy = new Proxy({ on, off }, {
    get: (target, prop) => {
      if (prop === "on" || prop === "off") return target[prop];
      return (...args) => callWebNavMethod(prop, ...args);
    }
  });

  window.Superpowers.webNavigation = webNavProxy;
})();
