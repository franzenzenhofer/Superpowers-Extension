/**
 * @typedef {Object} ScreenshotConfig
 * @property {string} [url] - The URL to open for screenshot (optional if tabId is provided).
 * @property {number} [tabId] - The tab ID to capture (optional if url is provided).
 * @property {"visible"|"full"} [captureMode="visible"] - Capture mode: 'visible' or 'full' page.
 * @property {"png"|"jpeg"} [format="png"] - Image format.
 * @property {number} [quality=100] - Quality (0-100) for JPEG format; ignored if PNG.
 * @property {number} [delayMs=1000] - Delay (ms) before capture.
 * @property {boolean} [keepTabOpen=false] - If true, do not close the newly created tab/window.
 * @property {number} [width] - Desired window width if creating a new window.
 * @property {number} [height] - Desired window height if creating a new window.
 * @property {string} [injectCss] - CSS string to inject.
 * @property {string} [injectJs] - JS string to inject.
 */

/**
 * Captures a screenshot of either a specified tab or a newly opened URL.
 * @param {ScreenshotConfig} config - Configuration for the screenshot.
 * @returns {Promise<string>} - Returns a data URL string of the screenshot.
 * @throws {Error} - Throws if required params are missing or capture fails.
 */
export function doScreenshot(config = {}) {
  return new Promise((resolve, reject) => {
    const {
      url,
      tabId,
      captureMode = "visible",
      format = "png",
      quality = 100,
      delayMs = 1000,
      keepTabOpen = false,
      width,
      height,
      injectCss = '',
      injectJs = ''
    } = config;
  
    // --------------------------------------------------------------------------
    // Validate critical parameters early:
    // --------------------------------------------------------------------------
    if (!tabId && !url) {
      reject(new Error("doScreenshot: must provide either 'tabId' or 'url'."));
      return;
    }
    if (!["png", "jpeg"].includes(format)) {
      reject(new Error(`doScreenshot: invalid format '${format}'. Use 'png' or 'jpeg'.`));
      return;
    }
    if (typeof quality !== "number" || quality < 0 || quality > 100) {
      reject(new Error(`doScreenshot: 'quality' must be a number between 0 and 100 (got ${quality}).`));
      return;
    }
    if (typeof delayMs !== "number" || delayMs < 0) {
      reject(new Error(`doScreenshot: 'delayMs' must be a non-negative number (got ${delayMs}).`));
      return;
    }
    if (width && (typeof width !== "number" || width < 1)) {
      reject(new Error(`doScreenshot: 'width' must be a positive number (got ${width}).`));
      return;
    }
    if (height && (typeof height !== "number" || height < 1)) {
      reject(new Error(`doScreenshot: 'height' must be a positive number (got ${height}).`));
      return;
    }
  
    let createdTabId = null;
    let createdWindowId = null;
    let finalTabId = tabId || null;
    let finalWindowId = null;
  
    // ------------------------------------------------------------------------
    // Step 1: If no tabId => create a new tab/window at (width x height) if given
    // ------------------------------------------------------------------------
    const createTabOrWindow = () => {
      if (!finalTabId && url) {
        if (width || height) {
          const wWidth = width || 1280;
          const wHeight = height || 800;
          return createSizedWindow(url, wWidth, wHeight)
            .then((newWin) => {
              createdWindowId = newWin.id;
              finalTabId = newWin.tabs?.[0]?.id;
              if (!finalTabId) {
                throw new Error("Failed to retrieve tabId from newly created window.");
              }
              finalWindowId = createdWindowId;
              return waitForTabComplete(finalTabId);
            });
        } else {
          return createTab(url)
            .then((newTab) => {
              createdTabId = newTab.id;
              finalTabId = newTab.id;
              finalWindowId = newTab.windowId;
              return waitForTabComplete(finalTabId);
            });
        }
      } else if (finalTabId) {
        return getTabInfo(finalTabId)
          .then((tabInfo) => {
            finalWindowId = tabInfo.windowId;
          });
      }
      return Promise.resolve();
    };
  
    // ------------------------------------------------------------------------
    // Step 2: Focus the window & tab to ensure correct capture
    // ------------------------------------------------------------------------
    const focusAndInject = () => {
      return focusTab(finalTabId, finalWindowId)
        .then(() => {
          if (injectCss) {
            return chrome.scripting.executeScript({
              target: { tabId: finalTabId },
              func: (css) => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
              },
              args: [injectCss]
            });
          }
        })
        .then(() => {
          if (injectJs) {
            return chrome.scripting.executeScript({
              target: { tabId: finalTabId },
              func: (codeToExecute) => {
                try {
                  return new Function(codeToExecute)();
                } catch (err) {
                  console.error("[Superpowers JS Injection Error]:", err);
                  return false;
                }
              },
              args: [injectJs]
            })
            .then(() => delay(1000));
          }
        })
        .then(() => delay(500));
    };
  
    // ------------------------------------------------------------------------
    // Step 3: Delay if requested (sometimes pages need time to render dynamic content)
    // ------------------------------------------------------------------------
    const delayIfNeeded = () => {
      if (delayMs > 0) {
        return delay(delayMs);
      }
      return Promise.resolve();
    };
  
    // ------------------------------------------------------------------------
    // Step 4: Actually capture the screenshot
    // ------------------------------------------------------------------------
    const captureScreenshot = () => {
      if (captureMode === "full") {
        return captureFullPage(finalTabId, finalWindowId, format, quality);
      } else {
        return captureTab(finalWindowId, format, quality);
      }
    };
  
    // ------------------------------------------------------------------------
    // Step 5: Close if we created the tab/window and user doesn't want to keep it open
    // ------------------------------------------------------------------------
    const closeIfNeeded = (dataUrl) => {
      if (!keepTabOpen) {
        if (createdWindowId !== null) {
          return removeWindow(createdWindowId).then(() => dataUrl);
        } else if (createdTabId !== null) {
          return removeTab(createdTabId).then(() => dataUrl);
        }
      }
      return Promise.resolve(dataUrl);
    };
  
    createTabOrWindow()
      .then(focusAndInject)
      .then(delayIfNeeded)
      .then(captureScreenshot)
      .then(closeIfNeeded)
      .then(resolve)
      .catch((err) => {
        console.error("doScreenshot encountered an error:", err);
        if (!keepTabOpen) {
          if (createdWindowId !== null) {
            safeRemoveWindow(createdWindowId).finally(() => reject(err));
          } else if (createdTabId !== null) {
            safeRemoveTab(createdTabId).finally(() => reject(err));
          } else {
            reject(err);
          }
        } else {
          reject(err);
        }
      });
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a new background tab for the given URL.
 * @param {string} url
 * @returns {Promise<chrome.tabs.Tab>}
 */
function createTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`createTab: ${err.message}`));
      } else if (!tab) {
        reject(new Error("createTab: No tab object returned."));
      } else {
        resolve(tab);
      }
    });
  });
}

/**
 * Create an entirely new window at a specific size with the given URL.
 * @param {string} url
 * @param {number} width
 * @param {number} height
 * @returns {Promise<chrome.windows.Window>}
 */
function createSizedWindow(url, width, height) {
  return new Promise((resolve, reject) => {
    chrome.windows.create({ url, focused: false, width, height, type: "normal" }, (win) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`createSizedWindow: ${err.message}`));
      } else if (!win) {
        reject(new Error("createSizedWindow: No window object returned."));
      } else {
        resolve(win);
      }
    });
  });
}

/**
 * Removes a tab by ID (safely).
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function removeTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`removeTab: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Removes a window by ID (safely).
 * @param {number} windowId
 * @returns {Promise<void>}
 */
function removeWindow(windowId) {
  return new Promise((resolve, reject) => {
    chrome.windows.remove(windowId, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`removeWindow: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Safely remove a tab, swallowing errors.
 * @param {number} tabId
 */
function safeRemoveTab(tabId) {
  try {
    removeTab(tabId);
  } catch (e) {
    console.warn(`safeRemoveTab: Could not remove tab ${tabId}.`, e);
  }
}

/**
 * Safely remove a window, swallowing errors.
 * @param {number} windowId
 */
function safeRemoveWindow(windowId) {
  try {
    removeWindow(windowId);
  } catch (e) {
    console.warn(`safeRemoveWindow: Could not remove window ${windowId}.`, e);
  }
}

/**
 * Wait until a given tab ID has status='complete'.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      reject(new Error(`waitForTabComplete: Timed out waiting for tab ${tabId} to load.`));
    }, 30000); // 30s timeout (tweak as needed)

    function handleUpdated(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(handleUpdated);
        resolve();
      }
    }

    try {
      chrome.tabs.onUpdated.addListener(handleUpdated);
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

/**
 * Retrieve info about a tab.
 * @param {number} tabId
 * @returns {Promise<chrome.tabs.Tab>}
 */
function getTabInfo(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`getTabInfo: ${err.message}`));
      } else if (!tab) {
        reject(new Error(`getTabInfo: No tab returned for tabId ${tabId}.`));
      } else {
        resolve(tab);
      }
    });
  });
}

/**
 * Focus a window and activate a tab.
 * @param {number} tabId
 * @param {number} [windowId]
 * @returns {Promise<void>}
 */
function focusTab(tabId, windowId) {
  // If windowId is missing or 0, skip focusing the window.
  const focusWindow = () => {
    if (typeof windowId === "number" && windowId > 0) {
      return new Promise((resolve, reject) => {
        chrome.windows.update(windowId, { focused: true }, () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(`focusTab (window): ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  };

  // Then activate the tab
  const activateTab = () => {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { active: true }, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(`focusTab (tab): ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  };

  return focusWindow().then(activateTab);
}

/**
 * Simple delay helper.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Captures the current visible viewport as a data URL.
 * @param {number} windowId
 * @param {"png"|"jpeg"} format
 * @param {number} quality
 * @returns {Promise<string>}
 */
function captureTab(windowId, format, quality) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format, quality }, (dataUrl) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`captureTab: ${err.message}`));
      } else if (!dataUrl) {
        reject(new Error("captureTab: No dataUrl returned from captureVisibleTab."));
      } else {
        resolve(dataUrl);
      }
    });
  });
}

/**
 * Captures the entire page by scrolling and stitching segments.
 *
 * @param {number} tabId - The ID of the Chrome tab to capture.
 * @param {number} windowId - The window ID for captureVisibleTab.
 * @param {"png"|"jpeg"} format - Image format.
 * @param {number} quality - JPEG quality (ignored if PNG).
 * @returns {Promise<string>} - Data URL of the full-page screenshot.
 *
 * NOTE: This version resets the "time limit" after every scroll, so if a page
 * is extremely tall, it won't time out globally. Instead, each scroll/capture
 * step has its own (configurable) per-step timeout.
 */
export function captureFullPage(tabId, windowId, format, quality) {
  return new Promise((resolve, reject) => {
    console.log("[captureFullPage] Starting capture for tab:", tabId);

    // 1. Get page dimensions with error handling
    let dimensions;
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const body = document.body;
        const html = document.documentElement;
        return {
          pageHeight: Math.max(
            body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight
          ),
          pageWidth: Math.max(
            body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth
          ),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth
        };
      }
    })
    .then(([injection]) => {
      if (!injection?.result) {
        throw new Error("Failed to get page dimensions");
      }
      dimensions = injection.result;
      console.log("[captureFullPage] Dimensions:", dimensions);

      // 2. Create canvas
      const canvas = new OffscreenCanvas(dimensions.pageWidth, dimensions.pageHeight);
      const ctx = canvas.getContext('2d');
      
      // 3. Capture each viewport height segment
      let currentY = 0;
      const captureSegments = () => {
        if (currentY < dimensions.pageHeight) {
          console.log(`[captureFullPage] Processing segment at Y=${currentY}`);
          
          // Scroll to position
          return chrome.scripting.executeScript({
            target: { tabId },
            func: (y) => window.scrollTo(0, y),
            args: [currentY]
          })
          .then(() => delay(1000)) // Wait longer for content to settle
          .then(() => captureTab(windowId, format, quality))
          .then((dataUrl) => createImageBitmapFromData(dataUrl))
          .then((bmp) => {
            ctx.drawImage(bmp, 0, currentY);
            bmp.close(); // Clean up
            currentY += dimensions.viewportHeight;
            return captureSegments();
          });
        }
        return Promise.resolve();
      };

      return captureSegments()
        .then(() => {
          // 4. Convert final canvas to blob
          return canvas.convertToBlob({
            type: `image/${format}`,
            quality: format === 'jpeg' ? quality / 100 : undefined
          });
        })
        .then(blobToDataURL)
        .then((finalDataUrl) => {
          console.log("[captureFullPage] Successfully completed full page capture");
          resolve(finalDataUrl);
        });
    })
    .catch((err) => {
      console.error("[captureFullPage] Dimension calculation failed:", err);
      reject(new Error(`Failed to calculate page dimensions: ${err.message}`));
    });
  });
}

/**
 * Converts a data URL to an ImageBitmap.
 * @param {string} dataUrl
 * @returns {Promise<ImageBitmap>}
 */
function createImageBitmapFromData(dataUrl) {
  return fetch(dataUrl)
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(`createImageBitmapFromData: fetch failed with status ${resp.status}`);
      }
      return resp.blob();
    })
    .then(createImageBitmap);
}

/**
 * Converts a Blob to data URL.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("blobToDataURL: Failed to read Blob data."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("blobToDataURL: Invalid result from FileReader."));
      }
    };
    reader.readAsDataURL(blob);
  });
}
