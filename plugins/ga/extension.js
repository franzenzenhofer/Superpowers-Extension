// plugins/ga/extension.js
// Service worker bridging for GA plugin.
// Relays messages from content => calls ga.js => responds to content => page.

import {
  createExtensionBridge
} from '/scripts/plugin_bridge.js';

// Import all necessary handlers from ga.js
import {
  login,
  getLoginStatus,
  test,
  listAccounts,
  listAccountSummaries,
  listProperties,
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
  listAudienceExports
} from "./ga.js";

export const ga_extension = {
  name: "ga_extension",

  install(context) {
    // Define the method handlers for the bridge
    // The bridge passes (methodName, args, sender, requestId)
    const methodHandlers = {
      // Simple mapping for most methods
      login: (m, args) => login(...args),
      test: (m, args) => test(...args),
      listAccounts: (m, args) => listAccounts(...args),
      listAccountSummaries: (m, args) => listAccountSummaries(...args),
      listProperties: (m, args) => listProperties(...args),
      runReport: (m, args) => runReport(...args),
      runPivotReport: (m, args) => runPivotReport(...args),
      batchRunReports: (m, args) => batchRunReports(...args),
      batchRunPivotReports: (m, args) => batchRunPivotReports(...args),
      runRealtimeReport: (m, args) => runRealtimeReport(...args),
      getMetadata: (m, args) => getMetadata(...args),
      checkCompatibility: (m, args) => checkCompatibility(...args),
      createAudienceExport: (m, args) => createAudienceExport(...args),
      getAudienceExport: (m, args) => getAudienceExport(...args),
      queryAudienceExport: (m, args) => queryAudienceExport(...args),
      listAudienceExports: (m, args) => listAudienceExports(...args),

      // Special case for synchronous getLoginStatus
      getLoginStatus: (methodName, args, sender, requestId) => {
        return Promise.resolve(getLoginStatus());
      },
    };

    // Create the extension bridge
    createExtensionBridge({
      pluginName: 'ga',
      methodHandlers,
    });

    /*
    console.log("[ga_extension] Extension bridge initialized.");
    */

    // The old chrome.runtime.onMessage listener is now handled by the bridge.
  }
};
