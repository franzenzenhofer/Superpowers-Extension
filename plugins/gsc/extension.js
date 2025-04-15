// plugins/gsc/extension.js
// Service worker bridging for GSC.
// Listens for messages from content scripts => calls gsc.js => responds.

import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

// Import all necessary handlers from gsc.js
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
    // Define the method handlers for the bridge
    // The bridge passes (methodName, args, sender, requestId)
    const methodHandlers = {
      // Simple mapping for most methods
      login: (m, args) => login(...args),
      test: (m, args) => test(...args),
      addSite: (m, args) => addSite(...args),
      deleteSite: (m, args) => deleteSite(...args),
      getSite: (m, args) => getSite(...args),
      listSites: (m, args) => listSites(...args),
      getSiteInfo: (m, args) => getSiteInfo(...args),
      querySearchAnalytics: (m, args) => querySearchAnalytics(...args),
      submitSitemap: (m, args) => submitSitemap(...args),
      deleteSitemap: (m, args) => deleteSitemap(...args),
      listSitemaps: (m, args) => listSitemaps(...args),
      getSitemap: (m, args) => getSitemap(...args),
      getTopQueries: (m, args) => getTopQueries(...args),
      getTopPages: (m, args) => getTopPages(...args),
      getDetailedAnalytics: (m, args) => getDetailedAnalytics(...args),
      getTopPagesDetailed: (m, args) => getTopPagesDetailed(...args),
      getQueryAnalyticsByPage: (m, args) => getQueryAnalyticsByPage(...args),
      getDeviceAnalytics: (m, args) => getDeviceAnalytics(...args),
      getCountryAnalytics: (m, args) => getCountryAnalytics(...args),
      inspectUrl: (m, args) => inspectUrl(...args),
      getRichResults: (m, args) => getRichResults(...args),
      getAmpStatus: (m, args) => getAmpStatus(...args),
      getMobileUsability: (m, args) => getMobileUsability(...args),
      getSearchAnalyticsByFilter: (m, args) => getSearchAnalyticsByFilter(...args),

      // Special case for getLoginStatus as it's synchronous
      getLoginStatus: (methodName, args, sender, requestId) => {
        // Synchronous functions need to be wrapped in a promise for the bridge
        return Promise.resolve(getLoginStatus());
      },
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'gsc',
      methodHandlers,
    });

    /*
    console.log("[gsc_extension] Extension bridge initialized.");
    */

    // The old chrome.runtime.onMessage listener is now handled by the bridge.
  }
};
