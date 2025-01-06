// plugins/superdebug/page.js
(function() {
  if (!window.Superpowers) {
    window.Superpowers = {};
  }
  console.log("[superdebug/page.js] loaded in page context");

  /**
   * Safely convert any input (object, array, etc.) into a readable string.
   */
  function toPrintable(value) {
    if (value == null) return String(value); // e.g. "null" or "undefined"
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (err) {
        return String(value); // fallback
      }
    }
    // For everything else (string, number, boolean), just cast to string
    return String(value);
  }

  window.Superpowers.debugLog = function(msg, level = "info", domElementOrSelector) {
    const timestamp = new Date().toISOString();
    const printableMsg = toPrintable(msg);

    // 1) Log to console
    const consoleLine = `[Superpowers.debugLog][${timestamp}] ${printableMsg}`;
    switch (level) {
      case "error":
        console.error(consoleLine);
        break;
      case "warn":
      case "warning":
        console.warn(consoleLine);
        break;
      case "debug":
        console.debug(consoleLine);
        break;
      default:
        console.log(consoleLine);
        break;
    }

    // 2) Try to append to the DOM element or selector (if provided)
    if (domElementOrSelector) {
      try {
        let el = domElementOrSelector;
        if (typeof domElementOrSelector === "string") {
          el = document.querySelector(domElementOrSelector);
        }
        if (el && el.nodeType === Node.ELEMENT_NODE) {
          const line = document.createElement("div");
          line.style.whiteSpace = "pre-wrap"; 
          line.textContent = `[${timestamp}][${level}] ${printableMsg}`;
          el.appendChild(line);
        }
      } catch (err) {
        console.debug("[superdebug/page.js] Failed to append log to DOM:", err);
      }
    }

    // 3) Send a message to the content script => background => sidepanel
    window.postMessage({
      direction: "from-page",
      type: "SUPERPOWERS_DEBUGLOG",
      payload: {
        level,
        timestamp,
        // Make sure we pass the printable string, not the raw object
        message: printableMsg,
        extra: {}
      }
    }, "*");
  };

  console.log("[superdebug/page.js] window.Superpowers.debugLog is ready");
})();
