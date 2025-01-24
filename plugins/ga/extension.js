// plugins/ga/extension.js
// Service worker bridging for GA plugin.
// Relays messages from content => calls ga.js => responds to content => page.

import {
  login,
  getLoginStatus,
  test,
  runReport,
  runPivotReport,
  batchRunReports,
  batchRunPivotReports,
  runRealtimeReport,
  getMetadata,
  checkCompatibility,
  createAudienceExport,
  getAudienceExport,
  queryAudienceExport,
  listAudienceExports,
  listAccounts,
  listAccountSummaries,
  listProperties
} from "./ga.js";

export const ga_extension = {
  name: "ga_extension",

  install(context) {
    const CALL_TYPE = "GA_CALL";

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== CALL_TYPE) return false;

      const { methodName, args } = request;
      console.log(`[ga_extension] method=${methodName}, args=`, args);

      let promise;
      switch (methodName) {
        case "login":
          promise = login(...args);
          break;
        case "getLoginStatus":
          sendResponse({ success: true, result: getLoginStatus() });
          return true;
        case "test":
          promise = test();
          break;

        // GA Admin
        case "listAccounts":
          promise = listAccounts(...args);
          break;
        case "listAccountSummaries":
          promise = listAccountSummaries(...args);
          break;
        case "listProperties":
          promise = listProperties(...args);
          break;

        // GA Data
        case "runReport":
          promise = runReport(...args);
          break;
        case "runPivotReport":
          promise = runPivotReport(...args);
          break;
        case "batchRunReports":
          promise = batchRunReports(...args);
          break;
        case "batchRunPivotReports":
          promise = batchRunPivotReports(...args);
          break;
        case "runRealtimeReport":
          promise = runRealtimeReport(...args);
          break;
        case "getMetadata":
          promise = getMetadata(...args);
          break;
        case "checkCompatibility":
          promise = checkCompatibility(...args);
          break;

        // Audience Exports
        case "createAudienceExport":
          promise = createAudienceExport(...args);
          break;
        case "getAudienceExport":
          promise = getAudienceExport(...args);
          break;
        case "queryAudienceExport":
          promise = queryAudienceExport(...args);
          break;
        case "listAudienceExports":
          promise = listAudienceExports(...args);
          break;

        default:
          promise = Promise.reject(new Error(`[ga_extension] Unknown method: ${methodName}`));
      }

      promise
        .then((result) => {
          sendResponse({ success: true, result });
        })
        .catch((err) => {
          console.error("[ga_extension] error =>", err);
          sendResponse({ success: false, error: err.message });
        });

      return true; // keep sendResponse channel open
    });
  }
};
