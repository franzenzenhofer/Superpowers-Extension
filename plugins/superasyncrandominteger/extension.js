import { generateRandomInteger } from "./superasyncrandominteger-lib.js";

export const superasyncrandominteger_extension = {
  name: "superasyncrandominteger_extension",

  install(context) {
    // Remove debug logging

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== "SUPERASYNCRANDOMINT_CALL") return false;
      const { requestId, payload } = request;
      const { timeMs, minVal, maxVal } = payload || {};

      generateRandomInteger(timeMs, minVal, maxVal).then((result) => {
        sendResponse({ success: true, result });
      }).catch((err) => {
        sendResponse({ success: false, error: err.toString() });
      });

      return true; // Keep async channel open
    });
  }
};