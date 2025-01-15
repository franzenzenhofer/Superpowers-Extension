// plugins/superdebug/extension.js (ES module)

// We'll store logs in memory here. If you want to persist them (chrome.storage), you can.
const debugLogState = {
  logs: []
};

/**
 * Convert any object or value to a string for sidepanel logs.
 */
function toPrintable(value) {
  if (value == null) return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }
  return String(value);
}

export const superdebug_extension = {
  name: "superdebug_extension",

  install(context) {
    const { debug } = context;
    // if (debug) console.log("[superdebug_extension] Installing Superpowers.debugLog in SW...");

    // Add a message listener for SUPERPOWERS_DEBUGLOG
    chrome.runtime.onMessage.addListener((request, sender) => {
      if (!request || request.type !== "SUPERPOWERS_DEBUGLOG") return;
      handleSuperpowersDebugLog(request, sender);
    });
  }
};

function handleSuperpowersDebugLog(request, sender) {
  // request.payload.message is already a string if the page used toPrintable,
  // but let's ensure we convert again, just in case.
  const { message, level, timestamp, extra } = request.payload || {};
  const printableMsg = toPrintable(message);

  // 1) Store in internal array
  debugLogState.logs.push({ timestamp, level, message: printableMsg, extra });
  if (debugLogState.logs.length > 200) {
    debugLogState.logs.splice(0, debugLogState.logs.length - 200);
  }

  // 2) Forward to the sidepanel
  // We'll show the printable string so we don't see [object Object]
  const sidepanelMsg = `[Superpowers][${timestamp}][lvl=${level}] ${printableMsg}`;
  chrome.runtime.sendMessage({
    type: "SIDEPANEL_LOG",
    message: sidepanelMsg,
    logType: level
  });

  // We do NOT call sendResponse here (no callback from the content script).
}
