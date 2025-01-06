
import { generateRandomInteger } from "./superasyncrandominteger-lib.js";

export const superasyncrandominteger_extension = {
  name: "superasyncrandominteger_extension",

  install(context) {
    if (context.debug) {
      console.log("[superasyncrandominteger_extension] Installing in SW...");
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERASYNCRANDOMINT_CALL") return false;
      const { requestId, payload } = request;
      const { timeMs, minVal, maxVal } = payload || {};
      console.log(`[superasyncrandominteger_extension] #${requestId} => timeMs: ${timeMs}, minVal: ${minVal}, maxVal: ${maxVal}`);

      generateRandomInteger(timeMs, minVal, maxVal).then((result) => {
        sendResponse({ success: true, result });
      }).catch((err) => {
        sendResponse({ success: false, error: err.toString() });
      });

      return true; // Keep async channel open
    });
  }
};