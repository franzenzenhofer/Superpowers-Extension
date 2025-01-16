// plugins/gsc/extension.js
// Service worker bridging for GSC.
// Listens for messages from content scripts => calls gsc.js => responds.

import {
  login,
  getLoginStatus,
  test,
  listSites,
  getSiteInfo,
  querySearchAnalytics,
  submitSitemap,
  deleteSitemap,
  listSitemaps,
  getTopQueries,
  getTopPages,
  getDetailedAnalytics,
  getTopPagesDetailed,
  getQueryAnalyticsByPage,
  getDeviceAnalytics,
  getCountryAnalytics
} from "./gsc.js";

export const gsc_extension = {
  name: "gsc_extension",

  install(context) {
    const CALL_TYPE = "GSC_CALL";

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type !== CALL_TYPE) return false;

      const { methodName, args } = request;
      console.log(`[gsc_extension] method=${methodName}, args=`, args);

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

        // Core:
        case "listSites":
          promise = listSites();
          break;
        case "getSiteInfo":
          promise = getSiteInfo(...args);
          break;
        case "querySearchAnalytics":
          promise = querySearchAnalytics(...args);
          break;
        case "submitSitemap":
          promise = submitSitemap(...args);
          break;
        case "deleteSitemap":
          promise = deleteSitemap(...args);
          break;
        case "listSitemaps":
          promise = listSitemaps(...args);
          break;

        // Sugar:
        case "getTopQueries":
          promise = getTopQueries(...args);
          break;
        case "getTopPages":
          promise = getTopPages(...args);
          break;

        // New analytics methods
        case "getDetailedAnalytics":
          promise = getDetailedAnalytics(...args);
          break;
        case "getTopPagesDetailed":
          promise = getTopPagesDetailed(...args);
          break;
        case "getQueryAnalyticsByPage":
          promise = getQueryAnalyticsByPage(...args);
          break;
        case "getDeviceAnalytics":
          promise = getDeviceAnalytics(...args);
          break;
        case "getCountryAnalytics":
          promise = getCountryAnalytics(...args);
          break;

        // Add new method cases
        case "inspectUrl":
          promise = inspectUrl(...args);
          break;

        case "getRichResults":
          promise = getRichResults(...args);
          break;

        case "getAmpStatus":
          promise = getAmpStatus(...args);
          break;

        case "getMobileUsability":
          promise = getMobileUsability(...args);
          break;

        case "getSearchAnalyticsByFilter":
          promise = getSearchAnalyticsByFilter(...args);
          break;

        default:
          promise = Promise.reject(
            new Error(`[gsc_extension] Unknown method: ${methodName}`)
          );
      }

      if (promise) {
        promise
          .then((result) => {
            sendResponse({ success: true, result });
          })
          .catch((error) => {
            console.error("[gsc_extension] error =>", error);
            sendResponse({ success: false, error: error.message });
          });
      }
      return true;
    });
  }
};
