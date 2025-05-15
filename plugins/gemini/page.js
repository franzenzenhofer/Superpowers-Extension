/**
 * page.js
 * ---------------------------------------------
 * This script runs in the context of the extension's pages
 * (such as sidepanel, options, popup, etc.).
 * 
 * Purpose:
 * - Provides access to Google Gemini functionality in extension pages
 * - Sets up a deep proxy to communicate with the service worker
 * - Exposes the Gemini API through window.Superpowers.Gemini
 * 
 * Extension pages operate in a different execution context than web pages,
 * so they need their own bridge to access the Gemini functionality.
 */

// Example usage:
// async function testGemini() {
//   if (window.superpowers && window.superpowers.gemini) {
//     try {
//       const response = await window.superpowers.gemini.generateContent({
//         model: 'gemini-2.0-flash-001',
//         contents: 'Hello! How can Google Gemini help today?'
//       });
//       
//       console.log('Gemini response:', response);
//       return response;
//     } catch (error) {
//       console.error('Error using Gemini:', error);
//     }
//   } else {
//     console.error('Superpowers or Gemini plugin not available');
//   }
// }

import { createPageDeepProxy } from "/scripts/pragmatic_deep_bridge.js";

// Self-executing function to initialize the Gemini deep proxy
(function() {
  // Create the Superpowers namespace if it doesn't exist
  if (!window.Superpowers) window.Superpowers = {};
  
  // Create and attach the deep proxy for Gemini in extension pages
  window.Superpowers.Gemini = createPageDeepProxy("gemini");
  console.debug("[gemini/page] Deep proxy injected.");
})(); 