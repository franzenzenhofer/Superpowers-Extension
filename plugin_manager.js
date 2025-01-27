// plugin_manager.js (ES module, static imports for known plugins)
import { superfetch_extension } from './plugins/superfetch/extension.js';
import { superenv_extension } from './plugins/superenv/extension.js';
import { superdebug_extension } from './plugins/superdebug/extension.js';
import { superpages_extension } from './plugins/superpages/extension.js';

// ADD THESE TWO IMPORTS:
import { superping_extension } from './plugins/superping/extension.js';
import { superpingasync_extension } from './plugins/superpingasync/extension.js';
import { superscreenshot_extension } from './plugins/superscreenshot/extension.js';

import { supertabs_extension } from './plugins/supertabs/extension.js';

import { superruntime_extension } from './plugins/superruntime/extension.js';
import { superwebrequest_extension } from './plugins/superwebrequest/extension.js';
import { superasyncrandominteger_extension } from './plugins/superasyncrandominteger/extension.js';
import { superopenai_extension } from './plugins/superopenai/extension.js';
import { superurlget_extension } from './plugins/superurlget/extension.js';
import { superdebugger_extension } from './plugins/superdebugger/extension.js'; // <-- NEW
import { superwebnavigation_extension } from './plugins/superwebnavigation/extension.js';
import { superaction_extension } from './plugins/superaction/extension.js';
import { gsc_extension } from './plugins/gsc/extension.js';
import { superconsoleintercept_extension } from './plugins/superconsoleintercept/extension.js';
import { ga_extension } from './plugins/ga/extension.js';
import { storage_extension } from './plugins/storage/extension.js';  // Add this import
import { superreadme_extension } from './plugins/superreadme/extension.js';


/**
 * This plugin manager now loads each plugin in a robust manner:
 * - If one fails, we catch that error, log a BIG WARNING, and continue with the rest.
 * - We store each plugin’s status in a Map, including any error message.
 */
async function installPlugin(extension, pluginContext, registerPlugin) {
  try {
    await extension.install(pluginContext);
    registerPlugin(extension, true);
  } catch (err) {
    // Truncate error message to reduce memory usage
    const truncatedMsg = (err.message || String(err)).slice(0, 120);
    registerPlugin(extension, false, { message: truncatedMsg });
  }
}

export async function initializePluginManager() {
  /*
  console.log("[plugin_manager] Starting initialization via ES module...");
  */

  const pluginContext = {
    debug: true,
    registeredPlugins: new Map()
  };

  // Helper to register plugin status
  function registerPlugin(plugin, status = true, error = null) {
    pluginContext.registeredPlugins.set(plugin.name, {
      name: plugin.name,
      active: status,
      installedAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      error: error ? (error.message || String(error)) : null
    });

    if (status) {
      /*
      console.log(`[plugin_manager] Plugin ${plugin.name} registered: ${status}`);
      */
    } else {
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error(`[plugin_manager] Plugin ${plugin.name} FAILED to load!`);
      console.error("Error details:", error);
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }
  }

  // Our list of known plugins to install. We do them all, even if some fail.
  const pluginList = [
    superfetch_extension,
    superenv_extension,
    superdebug_extension,
    superpages_extension,
    superping_extension,
    superpingasync_extension,
    superscreenshot_extension,
    supertabs_extension,
    superruntime_extension,
    superwebrequest_extension,
    superasyncrandominteger_extension,
    superopenai_extension,
    superurlget_extension,
    superdebugger_extension,
    superwebnavigation_extension,
    superaction_extension,
    superconsoleintercept_extension,
    gsc_extension,
    ga_extension,
    storage_extension,  // Add this to the plugin list
    superreadme_extension
  ];

  // Install each plugin in parallel
  await Promise.all(pluginList.map(ext =>
    installPlugin(ext, pluginContext, registerPlugin)
  ));

  /*
  console.log("[plugin_manager] All plugin installs attempted. Some may have failed; see warnings above if any.");
  */
  return pluginContext.registeredPlugins;
}
