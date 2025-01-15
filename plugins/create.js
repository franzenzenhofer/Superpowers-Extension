#!/usr/bin/env node
//
// create-bridge-plugins.js
//
// Usage: 
//   1) Place this script in your extension root (the same place that has your "plugins" folder).
//   2) Run "node create-bridge-plugins.js".
//   3) It creates two subfolders under plugins/: "superwebnavigation" and "superaction"
//      each containing "page.js", "content.js", "extension.js" with the code from our final solution.
//   4) Check console output for success or error messages.
//

const fs = require("fs/promises");
const path = require("path");

async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`[OK] Ensured directory: ${dirPath}`);
  } catch (err) {
    console.error(`[ERROR] Creating directory '${dirPath}' =>`, err);
    process.exit(1);
  }
}

async function writeFileSafely(filePath, content) {
  try {
    await fs.writeFile(filePath, content, { encoding: "utf-8" });
    console.log(`[OK] Created file: ${filePath}`);
  } catch (err) {
    console.error(`[ERROR] Writing file '${filePath}' =>`, err);
    process.exit(1);
  }
}

// The final plugin code for superwebnavigation:
const superWebNavPageJS = `
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
          reject(respEvent.data.error || \`Error calling chrome.webNavigation.\${methodName}\`);
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
`.trimStart();

const superWebNavContentJS = `
// plugins/superwebnavigation/content.js
// Content script bridging page <-> SW for chrome.webNavigation

(function () {
  const PLUGIN_CALL_TYPE = "SUPER_WEBNAVIGATION_CALL";
  const PLUGIN_RESPONSE_TYPE = "SUPER_WEBNAVIGATION_RESPONSE";
  const PLUGIN_EVENT_TYPE = "SUPER_WEBNAVIGATION_EVENT";

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== PLUGIN_CALL_TYPE) return;

    const { requestId, methodName, args } = ev.data;
    chrome.runtime.sendMessage(
      {
        type: PLUGIN_CALL_TYPE,
        requestId,
        methodName,
        args
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            direction: "from-content-script",
            type: PLUGIN_RESPONSE_TYPE,
            requestId,
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
          return;
        }
        window.postMessage({
          direction: "from-content-script",
          type: PLUGIN_RESPONSE_TYPE,
          requestId,
          success: response?.success,
          result: response?.result,
          error: response?.error
        }, "*");
      }
    );
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === PLUGIN_EVENT_TYPE) {
      window.postMessage({
        direction: "from-content-script",
        type: PLUGIN_EVENT_TYPE,
        eventName: msg.eventName,
        args: msg.args
      }, "*");
    }
  });
})();
`.trimStart();

const superWebNavExtensionJS = `
// plugins/superwebnavigation/extension.js
// Service worker bridging calls to chrome.webNavigation + broadcast events.

export const superwebnavigation_extension = {
  name: "superwebnavigation_extension",

  install(context) {
    const PLUGIN_CALL_TYPE = "SUPER_WEBNAVIGATION_CALL";
    const PLUGIN_EVENT_TYPE = "SUPER_WEBNAVIGATION_EVENT";

    if (context.debug) {
      console.log("[superwebnavigation_extension] Installing superwebnavigation in SW...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== PLUGIN_CALL_TYPE) return false;

      const { requestId, methodName, args } = request;
      if (typeof chrome.webNavigation[methodName] !== "function") {
        sendResponse({ success: false, error: \`No such method: chrome.webNavigation.\${methodName}\` });
        return true;
      }

      try {
        const maybePromise = chrome.webNavigation[methodName](...args, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            sendResponse({ success: false, error: err.message });
          } else {
            sendResponse({ success: true, result: res });
          }
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then((res) => {
            sendResponse({ success: true, result: res });
          }).catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
          return true;
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    });

    // pick webNavigation events to broadcast
    const EVENTS = [
      "onBeforeNavigate",
      "onCommitted",
      "onDOMContentLoaded",
      "onCompleted",
      "onErrorOccurred"
    ];

    EVENTS.forEach((evtName) => {
      chrome.webNavigation[evtName].addListener((details) => {
        broadcast(evtName, details);
      });
    });

    function broadcast(eventName, details) {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (t.id >= 0) {
            chrome.tabs.sendMessage(t.id, {
              type: PLUGIN_EVENT_TYPE,
              eventName,
              args: [details]
            });
          }
        }
      });
    }
  }
};
`.trimStart();

// The final plugin code for superaction:
const superActionPageJS = `
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
          reject(respEvent.data.error || \`Error calling chrome.action.\${methodName}\`);
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
`.trimStart();

const superActionContentJS = `
// plugins/superaction/content.js
// Content script bridging page <-> SW for chrome.action

(function() {
  const CALL_TYPE = "SUPER_ACTION_CALL";
  const RESPONSE_TYPE = "SUPER_ACTION_RESPONSE";
  const EVENT_TYPE = "SUPER_ACTION_EVENT";

  window.addEventListener("message", (ev) => {
    if (!ev.data || ev.data.direction !== "from-page") return;
    if (ev.data.type !== CALL_TYPE) return;

    const { requestId, methodName, args } = ev.data;
    chrome.runtime.sendMessage({
      type: CALL_TYPE,
      requestId,
      methodName,
      args
    }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({
          direction: "from-content-script",
          type: RESPONSE_TYPE,
          requestId,
          success: false,
          error: chrome.runtime.lastError.message
        }, "*");
        return;
      }
      window.postMessage({
        direction: "from-content-script",
        type: RESPONSE_TYPE,
        requestId,
        success: response?.success,
        result: response?.result,
        error: response?.error
      }, "*");
    });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === EVENT_TYPE) {
      window.postMessage({
        direction: "from-content-script",
        type: EVENT_TYPE,
        eventName: msg.eventName,
        args: msg.args
      }, "*");
    }
  });
})();
`.trimStart();

const superActionExtensionJS = `
// plugins/superaction/extension.js
// Service worker bridging calls to chrome.action and broadcasting events.

export const superaction_extension = {
  name: "superaction_extension",

  install(context) {
    if (context.debug) {
      console.log("[superaction_extension] Installing superaction in SW...");
    }

    const CALL_TYPE = "SUPER_ACTION_CALL";
    const EVENT_TYPE = "SUPER_ACTION_EVENT";

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== CALL_TYPE) return false;

      const { requestId, methodName, args } = request;
      if (typeof chrome.action[methodName] !== "function") {
        sendResponse({
          success: false,
          error: \`No such method: chrome.action.\${methodName}\`
        });
        return true;
      }

      try {
        const maybePromise = chrome.action[methodName](...args, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            sendResponse({ success: false, error: err.message });
          } else {
            sendResponse({ success: true, result: res });
          }
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then((res) => {
            sendResponse({ success: true, result: res });
          }).catch((err) => {
            sendResponse({ success: false, error: err.message });
          });
          return true;
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    });

    chrome.action.onClicked.addListener((tab) => {
      broadcast("onClicked", [ tab ]);
    });

    // optional: onUserSettingsChanged, etc.

    function broadcast(eventName, args) {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (t.id >= 0) {
            chrome.tabs.sendMessage(t.id, {
              type: EVENT_TYPE,
              eventName,
              args
            });
          }
        }
      });
    }
  }
};
`.trimStart();

/**
 * Main function that does all directory creation & file writing
 */
async function main() {
  console.log("=== Creating superwebnavigation & superaction plugin files ===");

  // 1) Ensure plugins/ folder
  const pluginsRoot = path.join(process.cwd(), "plugins");
  await ensureDirectory(pluginsRoot);

  // 2) superwebnavigation folder
  const navFolder = path.join(pluginsRoot, "superwebnavigation");
  await ensureDirectory(navFolder);

  // 2a) Write the three files
  await writeFileSafely(path.join(navFolder, "page.js"), superWebNavPageJS);
  await writeFileSafely(path.join(navFolder, "content.js"), superWebNavContentJS);
  await writeFileSafely(path.join(navFolder, "extension.js"), superWebNavExtensionJS);

  // 3) superaction folder
  const actionFolder = path.join(pluginsRoot, "superaction");
  await ensureDirectory(actionFolder);

  // 3a) Write those three files
  await writeFileSafely(path.join(actionFolder, "page.js"), superActionPageJS);
  await writeFileSafely(path.join(actionFolder, "content.js"), superActionContentJS);
  await writeFileSafely(path.join(actionFolder, "extension.js"), superActionExtensionJS);

  console.log("=== All plugin files created successfully! ===");
}

// Run main
main().catch((err) => {
  console.error("Uncaught error in create-bridge-plugins script:", err);
  process.exit(1);
});
