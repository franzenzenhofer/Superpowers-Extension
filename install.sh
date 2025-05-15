#!/bin/bash

# Install the Google Gen AI package
npm install @google/genai@0.12.0

echo "Google Gemini has been installed successfully!"
echo ""
echo "To use the Google Gemini functionality:"
echo "1. Load the extension in Chrome"
echo "2. Set the GEMINI_API_KEY environment variable in the extension"
echo "3. Use window.superpowers.gemini.generateContent() function in your web pages"
echo ""
echo "Example usage:"
echo "const response = await window.superpowers.gemini.generateContent({"
echo "  model: 'gemini-2.0-flash-001',"
echo "  contents: 'Hello, world!'"
echo "});"
echo "console.log(response.text);" 