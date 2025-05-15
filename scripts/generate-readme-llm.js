#!/usr/bin/env node
/**
 * generate-readme-llm.js
 * 
 * An enhanced documentation generator for Superpowers-Extension:
 * 1. Recursively analyzes plugins to identify structure, public methods, and dependencies
 * 2. Creates contextual relationships between plugins to understand dependencies
 * 3. Generates comprehensive, well-structured documentation with robust examples
 * 4. Creates a searchable, navigable README with cross-references and categorization
 * 
 * Make sure you have:
 * - node-fetch installed (npm i node-fetch)
 * - OPENAI_API_KEY in environment
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fetch = require('node-fetch');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// ---- Configuration ----
const PLUGINS_DIRECTORY = path.join(__dirname, '..', 'plugins');
const README_OUTPUT_PATH = path.join(__dirname, '..', 'README-LLM.md');

// AI Configuration
const OPENAI_MODEL = 'gpt-4.1';
const CONCURRENCY_LIMIT = 4;
const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions';

// Plugin Classification
const PLUGIN_CATEGORIES = {
  'COMMUNICATION': 'Networking and External Communication',
  'STORAGE': 'Data Storage and Management',
  'UI': 'User Interface and Interaction',
  'UTILITY': 'Utility and Helper Functions',
  'INTEGRATION': 'Third-party Service Integration',
  'SYSTEM': 'System and Browser APIs'
};

// ---- Introductory content for the README ----
const introContent = `# Superpowers Browser Extension Documentation

----

## Introduction

----

Hello! Welcome to **Superpowers** — a powerful Chrome extension that injects a variety of enhanced APIs into webpage contexts. With **Superpowers**, you can perform cross-domain fetches, manage environment variables, handle tab interactions, capture screenshots, or even interact with AI models like OpenAI or Google's Gemini, all from within a standard web page!

This documentation provides a comprehensive reference for developers who want to leverage the capabilities of the Superpowers extension. By the end of this guide, you'll understand:

1. What **Superpowers** is and how its architecture works
2. How to properly initialize and use the extension in your web applications
3. Detailed API references for all available plugins and methods
4. Real-world usage examples to jumpstart your development

This document is structured in carefully delineated sections with cross-references and a comprehensive table of contents to help you navigate the extensive functionality available.

----

## Table of Contents

----

- [Introduction](#introduction)
- [What is Superpowers?](#what-is-superpowers)
- [Architecture Overview](#architecture-overview)
- [Quick Start / Enabling Superpowers](#quick-start--enabling-superpowers)
  - [Initialization Best Practices](#initialization-best-practices)
  - [Migrating Existing Code](#migrating-existing-code)
- [Plugins by Category](#plugins-by-category)
- [Plugin Reference](#plugin-reference)
{PLUGINS_TOC}
- [Final Notes](#final-notes)

----

## What is Superpowers?

----

**Superpowers** is a Chrome extension that, when installed and running, injects a global \`window.Superpowers\` object into any page that opts in via a \`<meta name="superpowers" content="enabled" />\` tag in the \`<head>\`. The extension sets up secure bridging between the page context and the extension's service worker, allowing your web application to invoke powerful Chrome APIs that would ordinarily be inaccessible from standard JavaScript.

The extension follows a plugin-based architecture where each capability is encapsulated in its own plugin. This modular approach ensures that the extension remains maintainable, extendable, and secure.

----

## Architecture Overview

----

The Superpowers extension is built on a multi-layered architecture that ensures secure communication between different contexts:

1. **Service Worker (Background Script)**
   - The main background service worker for the extension
   - Runs with privileged browser permissions
   - Loads the plugin_manager, which registers each plugin's \`install(...)\` method
   - Routes messages from content scripts to appropriate plugin handlers
   - Executes privileged Chrome API calls on behalf of the page

2. **Content Scripts**
   - Auto-injected into tabs that have the Superpowers meta tag
   - Run in an isolated context with access to the page's DOM
   - Listen for messages from the page and relay them to the service worker
   - Facilitate two-way communication between the page and the service worker

3. **Page Context**
   - Contains the actual web application or page
   - Communicates with the extension through the \`window.Superpowers\` object
   - Initiates API calls that are bridged to the service worker

4. **Plugin Structure**
   Each plugin (e.g., superfetch, superenv, superopenai) typically consists of:
   - \`extension.js\`: Service worker logic with privileged access
   - \`content.js\`: Content script bridging code
   - \`page.js\`: Page-level code that exposes the API via \`window.Superpowers.xxx\`

This multi-layered approach ensures that privileged operations can be securely executed while maintaining appropriate isolation between contexts.

----

## Quick Start / Enabling Superpowers

----

To enable **Superpowers** in your web application:

1. **Ensure the extension is installed** in the user's Chrome browser.

2. **Add the required tags** in your page's \`<head>\` section:
\`\`\`html
<meta name="superpowers" content="enabled"/>
<script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
\`\`\`

3. **Initialize your application** using the \`Superpowers.ready()\` method:

\`\`\`javascript
// Wait for Superpowers to be fully initialized
Superpowers.ready(function() {
  console.log("✅ Superpowers is fully ready!");

  // Now you can safely call any Superpowers methods
  Superpowers.fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => {
      console.log("API Response:", data);
      // Process your data here
    })
    .catch(error => console.error("Error:", error));
});

// Optionally handle initialization errors
Superpowers.readyerror(function(errorDetails) {
  console.error("❌ Superpowers failed to initialize:", errorDetails);
  // Show appropriate UI for when Superpowers isn't available
  document.getElementById('error-container').textContent = 
    'Please install the Superpowers extension to use this application.';
});
\`\`\`

### Initialization Best Practices

For the most reliable initialization, follow these best practices:

1. **Always use the ready.js script** - This ensures proper setup and error handling.
2. **Use Superpowers.ready() for initialization** - This guarantees your code only runs when all plugins are available.
3. **Implement error handling with Superpowers.readyerror()** - This helps gracefully handle cases where the extension is not available.
4. **Avoid the deprecated timeout-based check** - The ready() method is more reliable and maintainable.

### Migrating Existing Code

If you have existing code that uses the old \`setTimeout\` pattern to check for Superpowers, here's how to migrate:

**Old approach (unreliable):**

\`\`\`javascript
function checkSuperpowers() {
  if (window.Superpowers && window.Superpowers.fetch) {
    initializeApp();
  } else {
    setTimeout(checkSuperpowers, 300);
  }
}
setTimeout(checkSuperpowers, 300);

function initializeApp() {
  // App initialization code that uses Superpowers
}
\`\`\`

**New approach (reliable):**

\`\`\`javascript
// Move your initialization code into the ready callback
Superpowers.ready(function() {
  // Your initializeApp code goes here - it will only run when
  // Superpowers is fully ready, eliminating race conditions

  // For example:
  Superpowers.getEnvVars()
    .then(vars => {
      console.log("Environment variables:", vars);
      // Initialize your application with the environment variables
      setupApiClient(vars.API_KEY);
      configureLogging(vars.LOG_LEVEL);
    })
    .catch(err => console.error("Error loading environment:", err));
});

// Optionally handle initialization failures
Superpowers.readyerror(function(errorDetails) {
  console.error("Superpowers failed to initialize:", errorDetails);
  // Show appropriate UI for when Superpowers isn't available
  displayErrorMessage("Please install the Superpowers extension to use this application.");
});
\`\`\`

This approach eliminates race conditions and provides better error handling.`;

// ---- Conclusion content for the README ----
const conclusionContent = `----

## Final Notes

----

### Best Practices

1. **Initialization**: Always use the \`Superpowers.ready()\` method to ensure the extension is fully loaded before using its features.

2. **Error Handling**: Implement proper error handling for all async operations, especially when communicating with external services.

3. **Security**: Be mindful of sensitive data. The Superpowers extension provides access to powerful APIs that should be used responsibly.

4. **Performance**: Some operations (like screenshots or large data fetches) can be resource-intensive. Consider the performance implications in your application design.

5. **Update Compatibility**: The extension is regularly updated with new features and improvements. Design your code to be resilient to API changes.

6. **AI**: When using the OpenAI model use "gpt-4.1" as the new default model. Older models like "gpt-4o"  or "gpt-3.5" are deprecated.

### Support and Contribution

If you encounter issues or have suggestions for improvements, please refer to the extension's GitHub repository for support options and contribution guidelines.

### License

The Superpowers extension is distributed under the appropriate license terms. Please refer to the LICENSE file in the repository for details.

---

*This documentation was automatically generated from the source code at ${getFormattedTimestamp()}.*

Happy coding with Superpowers!`;

// ---- Error codes ----
const ERROR_CODES = {
  NO_API_KEY: 'E001',
  DIR_NOT_FOUND: 'E002',
  GPT_ERROR: 'E003',
  FILE_READ_ERROR: 'E004',
  NETWORK_ERROR: 'E005'
};

// ---- Helper functions ----
function getFormattedTimestamp() {
  const now = new Date();
  return now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// ---- Concurrency control ----
let activeCount = 0;
const taskQueue = [];

function runTask(taskFn) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (activeCount < CONCURRENCY_LIMIT) {
        activeCount++;
        taskFn()
          .then(res => {
            activeCount--;
            next();
            resolve(res);
          })
          .catch(err => {
            activeCount--;
            next();
            reject(err);
          });
      } else {
        taskQueue.push(attempt);
      }
    };
    attempt();
  });
}

function next() {
  while (activeCount < CONCURRENCY_LIMIT && taskQueue.length > 0) {
    taskQueue.shift()();
  }
}

// ---- 1. Find all plugin directories ----
async function findPluginDirs() {
  console.log(`🔎 Scanning plugins directory: ${PLUGINS_DIRECTORY}`);
  
  try {
    const items = await readdir(PLUGINS_DIRECTORY);
    const results = [];
    
    for (const item of items) {
      const pluginPath = path.join(PLUGINS_DIRECTORY, item);
      const stats = await stat(pluginPath);
      
      if (stats.isDirectory()) {
        results.push(pluginPath);
        console.log(` 📦 Found plugin directory: ${item}`);
      }
    }
    
    return results;
  } catch (err) {
    console.error(`ERROR scanning plugins directory: ${err.message}`);
    return [];
  }
}

// ---- 2. Determine if a file is a text file ----
function isTextFile(name) {
  const lower = name.toLowerCase();
  const exts = [
    '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
    '.md', '.txt', '.log', '.html', '.css', '.scss', '.less',
    '.xml', '.svg', '.sh', '.bash', '.zsh', '.php', '.py', '.rb',
    '.conf', '.ini', '.env'
  ];
  return exts.some(ext => lower.endsWith(ext));
}

// ---- 3. Analyze plugin structure and gather files ----
async function analyzePlugin(pluginDir) {
  const pluginName = path.basename(pluginDir);
  const textFiles = [];
  const structure = {
    name: pluginName,
    hasPageJs: false,
    hasContentJs: false,
    hasExtensionJs: false,
    hasReadme: false,
    publicMethods: new Set(),
    dependencies: new Set(),
    imports: new Set(),
    eventListeners: new Set()
  };
  
  async function gatherFiles(dir) {
    const dirItems = await readdir(dir);
    
    for (const item of dirItems) {
      const fullPath = path.join(dir, item);
      const st = await stat(fullPath);
      const relativePath = path.relative(pluginDir, fullPath);
      
      if (st.isDirectory()) {
        await gatherFiles(fullPath);
      } else if (st.isFile() && isTextFile(item)) {
        try {
          const content = await readFile(fullPath, 'utf8');
          
          // Update structure information based on the file
          const lower = item.toLowerCase();
          if (lower === 'page.js') structure.hasPageJs = true;
          if (lower === 'content.js') structure.hasContentJs = true;
          if (lower === 'extension.js') structure.hasExtensionJs = true;
          if (lower === 'readme.md') structure.hasReadme = true;
          
          // Basic analysis of page.js to identify public methods
          if (lower === 'page.js') {
            const methodMatches = content.matchAll(/window\.Superpowers\.(\w+)(?:\.(\w+))?\s*=\s*(?:function|async function|\([^)]*\)\s*=>|[^;]*)/g);
            for (const match of methodMatches) {
              const method = match[2] ? `${match[1]}.${match[2]}` : match[1];
              structure.publicMethods.add(method);
            }
            
            // Look for imports/dependencies
            const importMatches = content.matchAll(/import\s+(?:{[^}]*}|\w+)\s+from\s+['"](.*)['"]/g);
            for (const match of importMatches) {
              structure.imports.add(match[1]);
            }
            
            // Look for event listeners
            const listenerMatches = content.matchAll(/\.addListener\(|\.addEventListener\(|\.on\(/g);
            if ([...listenerMatches].length > 0) {
              structure.hasEventListeners = true;
            }
          }
          
          textFiles.push(`FILE: ${relativePath}\n${content}`);
        } catch (err) {
          console.warn(` ⚠️ Could not read file "${item}": ${err.message}`);
        }
      }
    }
  }
  
  await gatherFiles(pluginDir);
  
  // Extract likely category based on plugin name and structure
  structure.category = determineCategory(pluginName, structure);
  
  return { textFiles, structure };
}

// Determine the likely category of a plugin
function determineCategory(pluginName, structure) {
  const name = pluginName.toLowerCase();
  
  if (name.includes('fetch') || name.includes('request') || name.includes('http') || 
      name.includes('net') || name.includes('urlget') || name.includes('ping')) {
    return 'COMMUNICATION';
  }
  
  if (name.includes('storage') || name.includes('env') || name.includes('var') ||
      name.includes('db') || name.includes('data')) {
    return 'STORAGE';
  }
  
  if (name.includes('ui') || name.includes('screen') || name.includes('panel') ||
      name.includes('tab') || name.includes('window') || name.includes('navigation')) {
    return 'UI';
  }
  
  if (name.includes('openai') || name.includes('gemini') || name.includes('ga') ||
      name.includes('gsc')) {
    return 'INTEGRATION';
  }
  
  if (name.includes('debug') || name.includes('console') || name.includes('log') ||
      name.includes('random') || name.includes('util')) {
    return 'UTILITY';
  }
  
  // Default to SYSTEM for other plugins
  return 'SYSTEM';
}

// ---- 4. Generate plugin documentation with GPT ----
async function generatePluginDoc(pluginDir) {
  const pluginName = path.basename(pluginDir);
  console.log(`\n🚀 Processing plugin: ${pluginName}`);
  
  // Analyze the plugin
  const { textFiles, structure } = await analyzePlugin(pluginDir);
  
  if (textFiles.length === 0) {
    console.log(` ❓ No text-like files found for "${pluginName}"`);
    return {
      name: pluginName,
      category: structure.category,
      content: `### ${pluginName}\n- **No text files** found for plugin.`,
      structure
    };
  }
  
  console.log(` 🗃 Found ${textFiles.length} text files in "${pluginName}" plugin.`);
  console.log(` 💬 Sending to ${OPENAI_MODEL} for documentation generation...`);
  
  const combinedText = textFiles.join('\n\n');
  const docContent = await createGPTDocumentation(pluginName, combinedText, structure);
  
  console.log(` ✅ Received docs for plugin: ${pluginName}`);
  
  return {
    name: pluginName,
    category: structure.category,
    content: docContent,
    structure
  };
}

// ---- 5. Call GPT to generate enhanced documentation ----
async function createGPTDocumentation(pluginName, combinedContent, structure) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(`${ERROR_CODES.NO_API_KEY}: Missing OPENAI_API_KEY environment variable.`);
  }
  
  // Create a more detailed system prompt that leverages the plugin structure
  const methodsString = [...structure.publicMethods].join(', ');
  
  const systemPrompt = `
You are an elite technical writer and JavaScript expert with 25+ years of experience. 
Your task is to create exceptional documentation for the "${pluginName}" plugin from the Superpowers Chrome extension.

The Superpowers extension adds capabilities to web pages through a global window.Superpowers object.
This plugin specifically contributes to the window.Superpowers object by adding methods or properties.

Your audience are senior JavaScript developers who need crystal-clear technical reference documentation.
Your analysis shows this plugin likely belongs to the "${structure.category}" category.
${structure.publicMethods.size > 0 ? `It appears to expose these methods: ${methodsString}` : ''}

Format your documentation according to this template:

### ${pluginName}
Type: [Bridge|Service|Utility|Integration|System] (Choose the most appropriate type)
Purpose: [Concise 1-2 sentence explanation of what this plugin does]

#### Public API

##### Superpowers.xxxMethod(param1, param2, ...) 
(Repeat for each public method, using exact method names from the code)
- Purpose: [Clear explanation of what this method does and when to use it]
- Parameters: 
  - \`param1\` (Type): Detailed description, including any constraints or special values
  - \`param2\` (Type): Description
- Returns: [Precise description of return value and its structure, especially for Promise responses]
- Example:
\`\`\`javascript
// Provide a realistic, comprehensive example that demonstrates the method
// Include proper error handling if the method returns a Promise
Superpowers.xxxMethod('example-value', {
  optionA: true,
  optionB: 'value'
})
  .then(result => {
    console.log("Success:", result);
    // Show how to use the result effectively
  })
  .catch(error => {
    console.error("Error:", error);
    // Show proper error handling
  });
\`\`\`

${structure.hasEventListeners ? `##### Event Listeners
Describe any event listeners or subscription methods the plugin provides.
` : ''}

##### Caveats & Edge Cases
- Document any important limitations, edge cases, or things developers should watch out for
- Document any required setup or dependencies

Your documentation MUST be:
1. Completely accurate and based ONLY on the source code provided
2. Focused entirely on the plugin's public interface (what's accessible via window.Superpowers)
3. Comprehensive, covering ALL public methods and their parameters
4. Practical, with realistic examples showing best practices including error handling
5. Clear about asynchronous methods, Promise returns, and event-based APIs
6. Written in a clear, concise style accessible to experienced JavaScript developers

IMPORTANT: ONLY document public methods that are exposed through window.Superpowers and meant to be called by page developers. Skip internal helper methods.
`.trim();
  
  const userPrompt = `
PLUGIN NAME: ${pluginName}
SOURCE CODE:
${combinedContent}

Based on the source code above, create comprehensive, accurate technical documentation for the "${pluginName}" plugin's public API.
Focus exclusively on what's available to web developers through the window.Superpowers object.
`.trim();
  
  const requestBody = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 2500
  };
  
  try {
    const response = await fetch(OPENAI_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`GPT API error (HTTP ${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error(`No content in GPT API response.`);
    }
    
    return content;
  } catch (err) {
    console.error(`❌ Error generating documentation for ${pluginName}: ${err.message}`);
    return `### ${pluginName}\n**Error generating documentation**: ${err.message}`;
  }
}

// ---- 6. Generate plugin reference by category ----
function generatePluginsByCategory(pluginDocs) {
  const categorized = {};
  
  // First pass: categorize plugins
  for (const plugin of pluginDocs) {
    const category = plugin.category;
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(plugin);
  }
  
  // Second pass: generate markdown by category
  let result = '----\n\n## Plugins by Category\n\n----\n\n';
  
  Object.keys(PLUGIN_CATEGORIES).forEach(categoryKey => {
    const categoryName = PLUGIN_CATEGORIES[categoryKey];
    const plugins = categorized[categoryKey] || [];
    
    if (plugins.length > 0) {
      result += `### ${categoryName}\n\n`;
      
      // List plugins in this category with brief descriptions
      plugins.forEach(plugin => {
        // Extract the first sentence of the purpose from the content
        const purposeMatch = plugin.content.match(/Purpose: ([^\.]+\.)/) || 
                            plugin.content.match(/Purpose: ([^\n]+)/);
        const purpose = purposeMatch ? purposeMatch[1].trim() : 'No description available.';
        
        result += `- **[${plugin.name}](#${plugin.name.toLowerCase()})**: ${purpose}\n`;
      });
      
      result += '\n';
    }
  });
  
  return result;
}

// ---- 7. Generate table of contents for plugins ----
function generatePluginsTOC(pluginDocs) {
  let toc = '';
  
  // Sort plugins alphabetically for the TOC
  const sortedPlugins = [...pluginDocs].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  sortedPlugins.forEach(plugin => {
    toc += `  - [${plugin.name}](#${plugin.name.toLowerCase()})\n`;
  });
  
  return toc;
}

// ---- Main function ----
async function main() {
  console.log(`\n==============================`);
  console.log(`🚧 Enhanced Superpowers Documentation Generator`);
  console.log(`==============================\n`);
  
  try {
    // Verify API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.error(`❌ ERROR: Missing OPENAI_API_KEY environment variable.`);
      process.exit(1);
    }
    
    // 1. Find all plugin directories
    const pluginDirs = await findPluginDirs();
    
    if (pluginDirs.length === 0) {
      console.log(`❗ No plugin directories found.`);
      process.exit(1);
    }
    
    console.log(`\n✅ Found ${pluginDirs.length} plugin directories.\n`);
    
    // 2. Generate documentation for each plugin concurrently
    const pluginDocs = [];
    const tasks = pluginDirs.map(dir => runTask(async () => {
      const docInfo = await generatePluginDoc(dir);
      pluginDocs.push(docInfo);
    }));
    
    await Promise.all(tasks);
    
    // 3. Generate plugins by category
    const pluginsByCategory = generatePluginsByCategory(pluginDocs);
    
    // 4. Generate TOC for plugins
    const pluginsTOC = generatePluginsTOC(pluginDocs);
    
    // 5. Combine all content into the final README
    const allPluginDocs = pluginDocs.length > 0
      ? [
          '----',
          '## Plugin Reference',
          '',
          ...pluginDocs.map(doc => doc.content)
        ].join('\n\n')
      : '----\n## Plugin Reference\n\nNo plugins found.';
    
    // Replace the TOC placeholder with the actual plugin TOC
    const updatedIntroContent = introContent.replace('{PLUGINS_TOC}', pluginsTOC);
    
    const finalReadmeContent = [
      `> Last updated: ${getFormattedTimestamp()}\n`,
      updatedIntroContent.trim(),
      pluginsByCategory.trim(),
      allPluginDocs.trim(),
      conclusionContent.trim()
    ].filter(Boolean).join('\n\n');
    
    // 6. Write the README file
    await writeFile(README_OUTPUT_PATH, finalReadmeContent, 'utf8');
    console.log(`\n📝 Generated README-LLM.md at: ${README_OUTPUT_PATH}`);
    
    console.log(`\n✅ Enhanced documentation generation complete!`);
  } catch (err) {
    console.error(`\n❌ ERROR: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main(); 