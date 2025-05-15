/**
 * content.js
 * ---------------------------------------------
 * This script is injected into web pages.
 * It provides the deep bridge for web pages to access Google Gemini functionality.
 * 
 * The content script acts as a bridge between the web page and the extension's
 * service worker (background) environment where the actual Gemini API calls are processed.
 */

// Import the deep bridge utility to establish secure communication between 
// content script and service worker (extension.js)
import { setupContentDeepBridge } from "/scripts/pragmatic_deep_bridge.js";

// Initialize the deep bridge with the "gemini" identifier to create a dedicated
// communication channel for this plugin
setupContentDeepBridge("gemini");
console.debug("[gemini/content] Deep bridge ready."); 