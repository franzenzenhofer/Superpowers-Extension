// plugins/gsc/extension.js
// Service worker bridging for GSC.
// Listens for messages from content scripts => calls gsc.js => responds.

import {
  login,
  getLoginStatus,
  test,
  // Official sites
  addSite,
  deleteSite,
  getSite,
  listSites,
  getSiteInfo, // sugar
  // Official search analytics
  querySearchAnalytics,
  // Official sitemaps
  submitSitemap,
  deleteSitemap,
  listSitemaps,
  getSitemap,
  // Sugar analytics
  getTopQueries,
  getTopPages,
  getDetailedAnalytics,
  getTopPagesDetailed,
  getQueryAnalyticsByPage,
  getDeviceAnalytics,
  getCountryAnalytics,
  // URL inspection
  inspectUrl,
  getRichResults,
  getAmpStatus,
  getMobileUsability,
  getSearchAnalyticsByFilter
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

        // Sites
        case "addSite":
          promise = addSite(...args);
          break;
        case "deleteSite":
          promise = deleteSite(...args);
          break;
        case "getSite":
          promise = getSite(...args);
          break;
        case "listSites":
          promise = listSites();
          break;
        case "getSiteInfo":
          promise = getSiteInfo(...args);
          break;

        // Search Analytics
        case "querySearchAnalytics":
          promise = querySearchAnalytics(...args);
          break;

        // Sitemaps
        case "submitSitemap":
          promise = submitSitemap(...args);
          break;
        case "deleteSitemap":
          promise = deleteSitemap(...args);
          break;
        case "listSitemaps":
          promise = listSitemaps(...args);
          break;
        case "getSitemap":
          promise = getSitemap(...args);
          break;

        // Sugar:
        case "getTopQueries":
          promise = getTopQueries(...args);
          break;
        case "getTopPages":
          promise = getTopPages(...args);
          break;
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

        // URL Inspection
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

        // Enhanced search analytics with filters
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
