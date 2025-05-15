# Superpowers Gemini Plugin README

## Overview

The Superpowers Gemini Plugin empowers your web pages by providing direct, client-side JavaScript access to Google's powerful Gemini family of AI models. This plugin securely manages your Google Gemini API key within the Superpowers extension and proxies your requests, allowing you to integrate advanced generative AI capabilities like text generation, multimodal understanding (images, videos, audio, documents), function calling, and more, without exposing your API key in client-side code.

This document outlines what the Gemini plugin does, how it works, and provides examples to leverage its full potential.

## How it Works

The Gemini plugin operates through the robust Superpowers extension framework:

1.  **Page-Level API (`window.Superpowers.Gemini`)**:
    Your web page interacts with the Gemini API via the `window.Superpowers.Gemini` object. This object is a proxy created by the plugin's `page.js` script using `createPageDeepProxy("gemini")`.

2.  **Secure Bridging**:
    *   When you call a method on `window.Superpowers.Gemini` (e.g., `window.Superpowers.Gemini.models.generateContent(...)`), the call is intercepted by the proxy.
    *   The proxy uses `window.postMessage` to send the method call details (including the method path like `models.generateContent` and arguments) to the Superpowers content script (`plugins/gemini/content.js`).
    *   The content script, configured with `setupContentDeepBridge("gemini")`, receives this message and forwards it securely to the extension's service worker via `chrome.runtime.sendMessage`.

3.  **Service Worker Logic (`plugins/gemini/extension.js`)**:
    *   The service worker listens for these messages using `setupExtensionDeepBridge("gemini", ensureClient)`.
    *   The `ensureClient` function is crucial:
        *   It securely retrieves your `GEMINI_API_KEY` from the Superpowers environment variables. You must set this key in the Superpowers side panel ("Environment Variable Manager").
        *   It initializes an instance of the `GoogleGenerativeAI` client using the vendored `@google/genai` SDK (located in `scripts/vendor/genai/adapter.js` which re-exports from `index.js`).
        *   If the API key changes in the environment variables, the client is re-initialized with the new key.
    *   The service worker then invokes the requested method (e.g., `generateContent`) on the `GoogleGenerativeAI` client instance with the provided arguments.

4.  **Gemini API Interaction & Response**:
    *   The `GoogleGenerativeAI` SDK, running within the service worker, makes the actual HTTP request to the Google Gemini API.
    *   The response from the Google API is returned to the service worker.
    *   This response is then relayed back through the content script to your page script, resolving the Promise returned by the initial `window.Superpowers.Gemini` call.

This architecture ensures that your `GEMINI_API_KEY` remains confidential within the extension's secure storage and service worker context, never exposed to the web page.

## Prerequisites

*   **Superpowers Extension**: The Superpowers Chrome Extension must be installed.
*   **Google Gemini API Key**: You need a valid API key for Google's Gemini models. Obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Setup

1.  **Enable Superpowers on Your Page**:
    Add the Superpowers meta tag and ready script to the `<head>` of your HTML file:
    ```html
    <meta name="superpowers" content="enabled" />
    <script type="text/javascript" src="https://superpowers.franzai.com/v1/ready.js"></script>
    ```

2.  **Configure `GEMINI_API_KEY`**:
    *   Open the Superpowers extension side panel (click the extension icon in Chrome).
    *   Go to the "Environment Variable Manager".
    *   Add a new environment variable:
        *   **Key**: `GEMINI_API_KEY`
        *   **Value**: `Your_Actual_Google_Gemini_API_Key`
    *   Click "Save" for that row, and then "Save All" if you made other changes. The Gemini plugin will automatically pick up the key.

## API Reference & Examples

The Gemini plugin makes an instance of the `@google/genai` SDK's `GoogleGenerativeAI` client available through `window.Superpowers.Gemini`. You can then access its methods, primarily through `window.Superpowers.Gemini.models.<methodName>`.

**Always ensure Superpowers is ready before making API calls:**

```javascript
Superpowers.ready(async () => {
    // Your Gemini API calls go here
    console.log("Superpowers and Gemini plugin are ready!");
    // Example:
    // await makeGeminiRequest();
});

Superpowers.readyerror((errorDetails) => {
    console.error("Superpowers failed to initialize:", errorDetails);
    // Handle inability to use the plugin
});
```

---

### 1. Text Generation

Generate text from a simple prompt.

```javascript
async function generateSimpleText() {
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest", // Or "gemini-2.5-flash-preview-04-17" for newer features
            contents: [{ role: "user", parts: [{ text: "Explain quantum computing in one sentence." }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 100
            }
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Text Response:", responseText);
        // Output: "Quantum computing is a type of computation that harnesses the collective properties of quantum states, such as superposition and entanglement, to perform calculations." (Example output)
    } catch (error) {
        console.error("Error generating text:", error);
    }
}
// Superpowers.ready(generateSimpleText);
```

### 2. Multi-turn Chat

Maintain a conversation with the model. Note: The Superpowers Gemini plugin itself doesn't maintain chat state; you need to manage the history on the client-side and pass it with each call. The `@google/genai` SDK's `Chat` class (`ai.chats.create(...)`) handles this state if used directly, but through our deep proxy, you pass the full `contents` array (history) each time.

```javascript
async function conductChat() {
    const chatHistory = [
        { role: "user", parts: [{ text: "Hello! I'm planning a trip to Japan." }] },
        { role: "model", parts: [{ text: "That's exciting! What aspects of Japan are you most interested in? Culture, food, nature?" }] }
    ];

    try {
        // User's next message
        chatHistory.push({ role: "user", parts: [{ text: "I'm very interested in traditional temples and modern art." }] });

        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: chatHistory, // Send the whole history
            generationConfig: { temperature: 0.8 }
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Chat Response:", responseText);
        // Add model's response to history for next turn
        if (responseText) {
            chatHistory.push({ role: "model", parts: [{ text: responseText }] });
        }
    } catch (error) {
        console.error("Error in chat:", error);
    }
}
// Superpowers.ready(conductChat);
```

### 3. Image Understanding (Multimodal Input)

Provide an image along with text for the model to analyze.

*Supported Image Formats: PNG, JPEG, WEBP, HEIC, HEIF.*

```javascript
// Assuming you have a base64 encoded image string:
// const base64ImageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."; (truncated)
// Or a File object from an <input type="file">

async function understandImage(base64ImageData, promptText) {
    if (!base64ImageData || !promptText) {
        console.error("Image data and prompt text are required.");
        return;
    }
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest", // Models like gemini-2.0-flash or 1.5-flash support vision
            contents: [
                { role: "user", parts: [
                    { text: promptText },
                    { inlineData: { mimeType: "image/jpeg", data: base64ImageData.split(',')[1] } } // Remove "data:image/jpeg;base64," prefix
                ]}
            ]
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Image Understanding Response:", responseText);
    } catch (error) {
        console.error("Error understanding image:", error);
    }
}

// Example:
// const sampleBase64Image = "your_base64_image_string_here";
// Superpowers.ready(() => understandImage(sampleBase64Image, "What objects are in this image? Describe their colors."));
```

To get bounding boxes for object detection (using a model that supports it, like Gemini 2.5 Flash):
```javascript
async function detectObjectsInImage(base64ImageData) {
    const promptText = "Detect all prominent items in the image. For each, provide a label and its bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000.";
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17", // Or a newer model with this capability
            contents: [
                { role: "user", parts: [
                    { text: promptText },
                    { inlineData: { mimeType: "image/jpeg", data: base64ImageData.split(',')[1] } }
                ]}
            ],
            generationConfig: { responseMimeType: "application/json" } // Request JSON for structured output
        });
        const responseJson = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        console.log("Detected Objects (JSON):", responseJson);
    } catch (error) {
        console.error("Error detecting objects:", error);
    }
}
```

### 4. Document Understanding (PDF Processing)

Process PDF documents. For larger PDFs (>20MB), you'd ideally use the Files API first. This example shows inline data for smaller PDFs.
*Max document pages for Gemini 1.5 Pro/Flash: ~3600 pages.*

```javascript
// Assuming base64PdfData is a base64 encoded string of your PDF file
// const base64PdfData = "JVBERi0xLjcNCiW..."; (truncated)

async function summarizePdf(base64PdfData) {
    if (!base64PdfData) {
        console.error("PDF data is required.");
        return;
    }
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-pro-latest", // Long context model
            contents: [
                { role: "user", parts: [
                    { text: "Summarize this PDF document in three key bullet points." },
                    { inlineData: { mimeType: "application/pdf", data: base64PdfData } }
                ]}
            ]
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini PDF Summary:", responseText);
    } catch (error) {
        console.error("Error processing PDF:", error);
    }
}
// Superpowers.ready(() => summarizePdf("your_base64_pdf_string_here"));
```

### 5. Video Understanding

Provide a video for analysis. For larger videos, use the Files API.
*Supported Video Formats: MP4, MPEG, MOV, AVI, FLV, WEBM, WMV, 3GPP.*
*Gemini 1.5 Pro (2M tokens) can process up to ~2 hours of video. Gemini 1.5 Flash (1M tokens) up to ~1 hour.*
*Videos are sampled at 1 FPS.*

```javascript
// Assuming base64VideoData is a base64 encoded string of your MP4 file
// const base64VideoData = "AAAAFGZ0eXAzZ3A0..."; (truncated)

async function describeVideo(base64VideoData) {
    if (!base64VideoData) {
        console.error("Video data is required.");
        return;
    }
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-pro-latest", // Model with video understanding
            contents: [
                { role: "user", parts: [
                    { text: "Describe the key events happening in this video. What is the overall mood?" },
                    { inlineData: { mimeType: "video/mp4", data: base64VideoData } }
                ]}
            ]
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Video Description:", responseText);
    } catch (error) {
        console.error("Error processing video:", error);
    }
}

// You can also refer to specific timestamps in your prompt, e.g.:
// "What happens at 00:32 in this video?"
// Superpowers.ready(() => describeVideo("your_base64_video_string_here"));
```

### 6. Audio Understanding

Analyze audio files.
*Supported Audio Formats: WAV, MP3, AIFF, AAC, OGG, FLAC.*
*Max audio length ~9.5 hours. Audio is downsampled to 16Kbps.*

```javascript
// Assuming base64AudioData is a base64 encoded string of your MP3 file
// const base64AudioData = "SUQzBAAAAAAB..."; (truncated)

async function transcribeAudio(base64AudioData) {
    if (!base64AudioData) {
        console.error("Audio data is required.");
        return;
    }
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: [
                { role: "user", parts: [
                    { text: "Transcribe the speech in this audio file." },
                    { inlineData: { mimeType: "audio/mp3", data: base64AudioData } }
                ]}
            ]
        });
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Audio Transcription:", responseText);
    } catch (error) {
        console.error("Error processing audio:", error);
    }
}
// Superpowers.ready(() => transcribeAudio("your_base64_audio_string_here"));
```

### 7. Structured Output (JSON Mode)

Request the model to output its response in JSON format, optionally conforming to a schema.

```javascript
async function getStructuredData() {
    const promptText = "Extract the name, job title, and key skills of a person from the following description: 'Dr. Ada Lovelace is a brilliant Senior Software Engineer at TechCorp, specializing in machine learning, Python, and advanced data analysis. She also enjoys public speaking.'";
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest", // Or gemini-2.0-flash
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
                responseMimeType: "application/json", // Request JSON output
                // Optionally, provide a responseSchema for more control
                responseSchema: {
                    type: "OBJECT", // Corresponds to Type.OBJECT in @google/genai
                    properties: {
                        name: { type: "STRING", description: "Full name of the person" },
                        job_title: { type: "STRING", description: "The person's job title" },
                        skills: { type: "ARRAY", items: { type: "STRING" }, description: "List of key skills" }
                    },
                    required: ["name", "job_title", "skills"]
                }
            }
        });
        const responseJson = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
        console.log("Gemini Structured (JSON) Response:", responseJson);
        // Expected output might be:
        // {
        //   "name": "Dr. Ada Lovelace",
        //   "job_title": "Senior Software Engineer",
        //   "skills": ["machine learning", "Python", "advanced data analysis", "public speaking"]
        // }
    } catch (error) {
        console.error("Error getting structured data:", error);
    }
}
// Superpowers.ready(getStructuredData);
```

### 8. Function Calling

Define functions that the Gemini model can choose to call to obtain external information or perform actions.

```javascript
async function useFunctionCalling() {
    const tools = [{
        functionDeclarations: [
            {
                name: "get_current_weather",
                description: "Get the current weather in a given location.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        location: { type: "STRING", description: "The city and state, e.g., San Francisco, CA" },
                        unit: { type: "STRING", enum: ["celsius", "fahrenheit"], description: "Temperature unit" }
                    },
                    required: ["location"]
                }
            }
        ]
    }];

    const initialPrompt = "What's the weather like in Boston, MA in Fahrenheit?";
    let conversationHistory = [{ role: "user", parts: [{ text: initialPrompt }] }];

    try {
        // First call to the model
        let result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest", // Or a model that strongly supports function calling
            contents: conversationHistory,
            tools: tools,
            // toolConfig: { functionCallingConfig: { mode: "ANY" } } // Optional: Force or guide function calling
        });

        let modelResponsePart = result.candidates?.[0]?.content?.parts?.[0];

        if (modelResponsePart?.functionCall) {
            const functionCall = modelResponsePart.functionCall;
            console.log("Gemini wants to call function:", functionCall.name, "with args:", functionCall.args);

            // --- Simulate executing the function ---
            let functionResponseData;
            if (functionCall.name === "get_current_weather") {
                // In a real app, you'd call your weather API here
                functionResponseData = {
                    location: functionCall.args.location,
                    temperature: "72",
                    unit: functionCall.args.unit || "fahrenheit", // Default if not specified
                    condition: "Sunny"
                };
            } else {
                functionResponseData = { error: "Unknown function called" };
            }
            // --- End of function simulation ---

            // Add the original model's function call and our function's response to history
            conversationHistory.push({ role: "model", parts: [modelResponsePart] }); // Model's request to call function
            conversationHistory.push({
                role: "function", // or "tool" in some SDKs, but @google/genai docs use "function" role for response
                parts: [{ functionResponse: { name: functionCall.name, response: functionResponseData } }]
            });

            // Second call to the model with the function response
            result = await window.Superpowers.Gemini.models.generateContent({
                model: "gemini-1.5-flash-latest",
                contents: conversationHistory,
                tools: tools // It's good practice to send tools again
            });
            modelResponsePart = result.candidates?.[0]?.content?.parts?.[0];
        }

        const finalResponseText = modelResponsePart?.text;
        console.log("Gemini Final Response (after function call):", finalResponseText);
        // Expected: "The current weather in Boston, MA is 72°F and Sunny." (or similar)

    } catch (error) {
        console.error("Error during function calling:", error);
    }
}
// Superpowers.ready(useFunctionCalling);
```

### 9. Grounding with Google Search

Enhance model responses with real-time information from Google Search.
*Note: `googleSearchRetrieval` is for Gemini 1.5 models. For Gemini 2.0+, use `googleSearch` as a tool.*

```javascript
async function getGroundedResponse() {
    try {
        // For Gemini 1.5 models (e.g., gemini-1.5-flash-latest)
        const result1_5 = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: [{ role: "user", parts: [{ text: "Who won the latest F1 Grand Prix?" }] }],
            tools: [{ googleSearchRetrieval: {} }] // Enable grounding
        });
        console.log("Grounded Response (Gemini 1.5):", result1_5.candidates?.[0]?.content?.parts?.[0]?.text);
        console.log("Grounding Metadata (1.5):", result1_5.candidates?.[0]?.groundingMetadata);

        // For Gemini 2.0+ models (e.g., gemini-2.0-flash, requires different tool config if that model supports it)
        // This example assumes gemini-2.0-flash-latest has similar search tool capabilities
        const result2_0 = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-2.0-flash", // Check model docs for grounding tool name
            contents: [{ role: "user", parts: [{ text: "What's the current weather in London?" }] }],
            tools: [{ googleSearch: {} }] // For Gemini 2.0+, 'googleSearch' is the tool
        });
        console.log("Grounded Response (Gemini 2.0+):", result2_0.candidates?.[0]?.content?.parts?.[0]?.text);
        console.log("Grounding Metadata (2.0+):", result2_0.candidates?.[0]?.groundingMetadata);

    } catch (error) {
        console.error("Error getting grounded response:", error);
    }
}
// Superpowers.ready(getGroundedResponse);
```

### 10. Token Counting

Estimate the number of tokens for a given prompt.

```javascript
async function countMyTokens(promptText) {
    try {
        const result = await window.Superpowers.Gemini.models.countTokens({
            model: "gemini-1.5-flash-latest",
            contents: [{ role: "user", parts: [{ text: promptText }] }]
        });
        console.log(`Token count for "${promptText}": ${result.totalTokens}`);
        return result.totalTokens;
    } catch (error) {
        console.error("Error counting tokens:", error);
    }
}
// Superpowers.ready(() => countMyTokens("This is a test sentence."));
```

## Models and Token Limits

Google offers a variety of Gemini models, each with different capabilities, context window sizes, and pricing. The Superpowers Gemini plugin can work with any model compatible with the version of the `@google/genai` SDK it's using.

**Key Modern Models (as of May 2025, refer to official docs for latest):**

*   **Gemini 2.5 Pro Preview (`gemini-2.5-pro-preview-05-06` or `gemini-2.5-pro-latest`)**:
    *   Most powerful reasoning model.
    *   Context Window: Up to **2 million tokens**.
    *   Capabilities: Advanced text, image, audio, video understanding; complex reasoning; coding.
    *   Features: Supports "Thinking Budget".
*   **Gemini 2.5 Flash Preview (`gemini-2.5-flash-preview-04-17` or `gemini-2.5-flash-latest`)**:
    *   Best price-performance, adaptive thinking.
    *   Context Window: Up to **1 million tokens**.
    *   Capabilities: Multimodal understanding, fast responses.
    *   Features: Supports "Thinking Budget".
*   **Gemini 2.0 Flash (`gemini-2.0-flash` or `gemini-2.0-flash-001`)**:
    *   Balanced multimodal model, built for agentic experiences.
    *   Context Window: Up to **1 million tokens**.
    *   Capabilities: Text, image, audio, video understanding; code execution; image generation (experimental); grounding.
*   **Gemini 2.0 Flash-Lite (`gemini-2.0-flash-lite`)**:
    *   Smallest, most cost-effective for high-frequency tasks.
    *   Context Window: Up to **1 million tokens** (confirm with latest docs).
    *   Capabilities: Multimodal understanding.
*   **Gemini 1.5 Pro (`gemini-1.5-pro-latest`)**:
    *   High-intelligence model, good for complex reasoning.
    *   Context Window: Up to **2 million tokens** (previously 1M, GA with 2M).
    *   Capabilities: Multimodal understanding, long context.
*   **Gemini 1.5 Flash (`gemini-1.5-flash-latest` or `gemini-1.5-flash-001`)**:
    *   Fast and versatile for diverse tasks.
    *   Context Window: Up to **1 million tokens**.
    *   Capabilities: Multimodal understanding.
*   **Imagen 3 (`imagen-3.0-generate-002`)**:
    *   Advanced text-to-image generation.
    *   Accessed via `window.Superpowers.Gemini.models.generateImages(...)` if the underlying SDK version and client configuration support it or if the Gemini API offers an Imagen endpoint through the same client. *The OpenAI compatibility layer docs confirm `client.images.generate` is possible, suggesting the main client may proxy this or have a similar path.*
*   **Veo 2 (`veo-2.0-generate-001`)**:
    *   High-quality text-to-video and image-to-video generation.
    *   Accessed via `window.Superpowers.Gemini.models.generateVideos(...)`.

**Important Notes on Tokens & Limits:**

*   **Token Equivalence**: For Gemini models, 1 token is roughly 4 characters or 0.6-0.8 English words.
*   **Context Window**: This is the total number of tokens (input + output) the model can process in a single request.
*   **Rate Limits**: The Gemini API imposes rate limits (Requests Per Minute - RPM, Tokens Per Minute - TPM, etc.) which vary by model and your project's usage tier (Free Tier, Paid Tier). Exceeding these limits will result in errors.
*   **Always check the [official Google AI documentation](https://ai.google.dev/gemini-api/docs/models) for the most current list of models, their capabilities, and specific token limits.**

## Safety Settings

You can configure safety settings for your API calls to filter content based on categories like Harassment, Hate Speech, Sexually Explicit, and Dangerous Content.

```javascript
async function generateWithSafetySettings() {
    try {
        const result = await window.Superpowers.Gemini.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: [{ role: "user", parts: [{ text: "Tell me a very dark joke." }] }],
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_ONLY_HIGH" // Or BLOCK_MEDIUM_AND_ABOVE, BLOCK_LOW_AND_ABOVE, BLOCK_NONE
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
                // Add other categories as needed
            ]
        });
        // Check result.candidates[0].finishReason and result.candidates[0].safetyRatings
        // If finishReason is "SAFETY", the content was blocked.
        console.log("Safety Demo Response:", result);
    } catch (error) {
        console.error("Error with safety settings demo:", error);
    }
}
// Superpowers.ready(generateWithSafetySettings);
```
Refer to the [Safety Settings Documentation](https://ai.google.dev/gemini-api/docs/safety-settings) for details on categories and thresholds.

## Troubleshooting

*   **"GEMINI\_API\_KEY is missing"**: Ensure the key is correctly set in the Superpowers side panel's Environment Variable Manager and saved.
*   **401/403 Errors**: Your API key might be invalid, expired, or lack permissions for the requested model or feature.
*   **429 Errors**: You've exceeded the API rate limits for your project tier or the specific model.
*   **Model Not Found**: The specified model name might be incorrect or not available for your API key/region. Check the [official model list](https://ai.google.dev/gemini-api/docs/models).
*   **Unexpected Output/Blocked Content**: Review your prompt, safety settings, and the model's response (including `finishReason` and `safetyRatings`).

## Security

*   Your `GEMINI_API_KEY` is stored within the Superpowers extension and is **not directly exposed** to your web page's JavaScript. All API calls are proxied through the extension's secure service worker environment.
*   Always follow best practices for API key management and avoid sharing your key.

This README provides a comprehensive guide to using the Superpowers Gemini Plugin. For the most detailed and up-to-date information on Gemini API capabilities, models, and SDK usage, always refer to the [official Google AI documentation](https://ai.google.dev/gemini-api/docs).