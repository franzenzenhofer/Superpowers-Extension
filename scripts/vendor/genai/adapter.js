/**
 * Gemini API Adapter
 * 
 * Simple adapter to re-export GoogleGenAI for use in the extension.
 * The actual compatibility layer is implemented in extension.js.
 */

import { GoogleGenAI } from './index.js';

// Re-export the GoogleGenAI class as GoogleGenerativeAI
export const GoogleGenerativeAI = GoogleGenAI; 