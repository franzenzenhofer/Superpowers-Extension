# Google Generative AI SDK (Vendored)

This directory contains a vendored copy of the Google Generative AI JavaScript client library.

## Why is this necessary?

Chrome extensions can't use npm-style bare imports like `import { GoogleGenerativeAI } from "@google/genai"` directly in service workers. Instead, they need to use relative paths to bundled or vendored libraries.

## Contents

- `index.js` - Direct copy of the @google/genai web build
- `adapter.js` - Compatibility adapter to handle API changes between versions 

## How it was created

The library was copied from the npm package:

```
cp node_modules/@google/genai/dist/web/index.mjs scripts/vendor/genai/index.js
```

The adapter was created to handle naming changes between library versions (GoogleGenAI vs GoogleGenerativeAI).

## Updating

When updating the @google/genai package, you'll need to:

1. Update the npm package via `npm update @google/genai`
2. Re-copy the updated build to this directory
3. Check if the adapter still works with the new version 