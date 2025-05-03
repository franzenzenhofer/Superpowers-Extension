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
 * - We store each plugin's status in a Map, including any error message.
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
      console.log(`[plugin_manager] Plugin ${plugin.name} registered successfully`);
    } else {
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error(`[plugin_manager] Plugin ${plugin.name} FAILED to load!`);
      console.error("Error details:", error);
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }
  }

  // We need to install critical plugins first, in sequence
  // These are dependencies that other plugins rely on, especially superenv
  const criticalPlugins = [
    superenv_extension, // Must be loaded first as other plugins depend on it
  ];

  // Install critical plugins first, in sequence
  console.log("[plugin_manager] Installing critical plugins sequentially...");
  for (const plugin of criticalPlugins) {
    console.log(`[plugin_manager] Installing critical plugin: ${plugin.name}`);
    await installPlugin(plugin, pluginContext, registerPlugin);
    
    // Verify the environment plugin is active before continuing
    if (plugin.name === 'superenv_extension' && 
        (!pluginContext.registeredPlugins.get(plugin.name) || 
         !pluginContext.registeredPlugins.get(plugin.name).active)) {
      console.error("[plugin_manager] CRITICAL ERROR: superenv failed to load, this will affect other plugins!");
    }
  }

  // Secondary critical plugins that depend on the first set
  const secondaryPlugins = [
    superopenai_extension, // Depends on superenv for API key
  ];

  // Install secondary critical plugins
  console.log("[plugin_manager] Installing secondary critical plugins...");
  for (const plugin of secondaryPlugins) {
    console.log(`[plugin_manager] Installing secondary plugin: ${plugin.name}`);
    await installPlugin(plugin, pluginContext, registerPlugin);
  }

  // Remaining plugins
  const remainingPlugins = [
    superfetch_extension,
    superdebug_extension,
    superpages_extension,
    superping_extension,
    superpingasync_extension,
    superscreenshot_extension,
    supertabs_extension,
    superruntime_extension,
    superwebrequest_extension,
    superasyncrandominteger_extension,
    superurlget_extension,
    superdebugger_extension,
    superwebnavigation_extension,
    superaction_extension,
    superconsoleintercept_extension,
    gsc_extension,
    ga_extension,
    storage_extension,
    superreadme_extension
  ];

  // Install the rest of the plugins in parallel
  console.log("[plugin_manager] Installing remaining plugins in parallel...");
  await Promise.all(remainingPlugins.map(ext =>
    installPlugin(ext, pluginContext, registerPlugin)
  ));

  console.log("[plugin_manager] All plugin installations complete");

  // Calculate overall success status
  let overallSuccess = true;
  for (const status of pluginContext.registeredPlugins.values()) {
    if (!status.active) {
      overallSuccess = false;
      break; // No need to check further if one failed
    }
  }

  // Return the final status object
  return {
    success: overallSuccess,
    results: pluginContext.registeredPlugins
  };
}
