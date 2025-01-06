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


export async function initializePluginManager() {
  console.log("[plugin_manager] Starting initialization via ES module...");

  const pluginContext = {
    debug: true,
    registeredPlugins: new Map()
  };

  // Helper to register plugin status
  function registerPlugin(plugin, status = true) {
    pluginContext.registeredPlugins.set(plugin.name, {
      name: plugin.name,
      active: status,
      installedAt: new Date().toISOString(),
      lastChecked: new Date().toISOString()
    });
    console.log(`[plugin_manager] Plugin ${plugin.name} registered: ${status}`);
  }

  // Install plugins with status tracking
  try {
    // Superfetch
    await superfetch_extension.install(pluginContext);
    registerPlugin(superfetch_extension, true);

    // Superenv
    await superenv_extension.install(pluginContext);
    registerPlugin(superenv_extension, true);

    // Superdebug
    await superdebug_extension.install(pluginContext);
    registerPlugin(superdebug_extension, true);

    // Superpages
    await superpages_extension.install(pluginContext);
    registerPlugin(superpages_extension, true);

    // SUPERPING
    await superping_extension.install(pluginContext);
    registerPlugin(superping_extension, true);

    // SUPERPINGASYNC
    await superpingasync_extension.install(pluginContext);
    registerPlugin(superpingasync_extension, true);

    // SUPERSCREENSHOT
    await superscreenshot_extension.install(pluginContext);
    registerPlugin(superscreenshot_extension, true);

    // SUPERTABS
    await supertabs_extension.install(pluginContext);
    registerPlugin(supertabs_extension, true);

    // SUPER RUNTIME
    await superruntime_extension.install(pluginContext);
    registerPlugin(superruntime_extension, true);

    // SUPER WEBREQUEST
    await superwebrequest_extension.install(pluginContext);
    registerPlugin(superwebrequest_extension, true);

    // SUPERASYNC RANDOM INTEGER
    await superasyncrandominteger_extension.install(pluginContext);
    registerPlugin(superasyncrandominteger_extension, true);

    // SUPEROPENAI
    await superopenai_extension.install(pluginContext);
    registerPlugin(superopenai_extension, true);

    console.log("[plugin_manager] All plugins installed successfully");
    return pluginContext.registeredPlugins;
  } catch (err) {
    console.error("[plugin_manager] Plugin initialization error:", err);
    if (err.pluginName) {
      registerPlugin({ name: err.pluginName }, false);
    }
    throw err;
  }
}
