/**
 * extension.js
 * ---------------------------------------------
 * The service worker / background script bridging logic.
 * 
 * This file runs in the extension's privileged context (service worker)
 * and serves as the secure bridge between web pages and the Google Generative AI API.
 * 
 * Key responsibilities:
 * 1. Securely access and manage the Gemini API key
 * 2. Initialize the Google Generative AI client
 * 3. Proxy API calls from content scripts to the Gemini API
 * 4. Set up the deep bridge for secure communication
 * 5. Handle API key changes via storage events
 */

// Import the GoogleGenerativeAI client adapter, providing access to Gemini models
import { GoogleGenerativeAI } from "/scripts/vendor/genai/adapter.js";
// Import the deep bridge utility for extension-side communication
import { setupExtensionDeepBridge } from "/scripts/pragmatic_deep_bridge.js";

// Store the client instance to avoid recreating it for every request
let client  = null;
// Cache the API key to detect changes
let apiKey  = null;

/**
 * Ensures a valid GoogleGenerativeAI client exists or creates a new one.
 * 
 * This function:
 * 1. Retrieves the API key from extension storage
 * 2. Validates the key exists
 * 3. Creates a new client if one doesn't exist or if the key has changed
 * 4. Returns the client for use in API calls
 * 
 * @returns {Promise<GoogleGenerativeAI>} A properly initialized client
 * @throws {Error} If the API key is missing or invalid
 */
async function ensureClient() {
  // Fetch environment variables from extension storage
  const { superEnvVars } = await chrome.storage.local.get("superEnvVars");
  // Extract the Gemini API key specifically from the env vars
  const key = superEnvVars?.default?.GEMINI_API_KEY;
  // Throw an error if no API key is found, preventing unauthorized API calls
  if (!key) throw new Error("GEMINI_API_KEY is missing in Superpowers env");
  
  // Create a new client if we don't have one or if the API key has changed
  if (!client || key !== apiKey) {
    console.log("[gemini/ext] Initializing client with API key");
    
    // Initialize the GoogleGenerativeAI client with API key
    // The deep bridge will proxy this entire object to the page
    client = new GoogleGenerativeAI({ apiKey: key });
    apiKey = key;
  }
  
  return client;
}

// Export the plugin module for registration with the Superpowers extension framework
export const gemini_extension = {
  name: "gemini_extension",
  
  /**
   * Installs the Gemini plugin in the extension environment.
   * Called by the plugin manager when the extension loads.
   * 
   * @param {Object} ctx - The plugin context
   */
  async install(ctx) {
    // Set up the deep bridge to securely expose the Gemini client to content scripts
    // The ensureClient function is passed as a factory to create clients on demand
    setupExtensionDeepBridge("gemini", ensureClient);

    // Monitor for changes to the API key in storage
    // This allows for dynamic updates without requiring a browser restart
    chrome.storage.onChanged.addListener((chg, area) => {
      if (area === "local" && chg.superEnvVars) {
        // Extract the new API key from the storage changes
        const newKey = chg.superEnvVars.newValue?.default?.GEMINI_API_KEY;
        // If the key changed, invalidate the current client to force recreation
        if (newKey !== apiKey) { client = null; apiKey = null; }
      }
    });

    // Pre-warm the client to surface key errors early during plugin installation
    // This helps detect configuration issues without waiting for the first API call
    await ensureClient().catch(e => console.error("[gemini/ext] init fail:", e));
  }
}; 