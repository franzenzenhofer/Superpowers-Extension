// plugins/superaction/page.js
console.log("[superaction/page.js] STARTING EXECUTION");
import { createPageBridge } from '../../scripts/plugin_bridge.js';

// Ensure Superpowers namespace exists
if (!window.Superpowers) {
    console.log("[superaction/page.js] Creating window.Superpowers namespace");
    window.Superpowers = {};
}

// Create and assign the bridge proxy
console.log("[superaction/page.js] Calling createPageBridge...");
window.Superpowers.action = createPageBridge('superaction');
console.log("[superaction/page.js] ASSIGNED Superpowers.action:", window.Superpowers.action);

// console.log("[superaction/page.js] Bridge initialized.");
