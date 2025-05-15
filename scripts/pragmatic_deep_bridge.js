// scripts/pragmatic_deep_bridge.js
// Pragmatic Deep Bridge – generic helper (page, content, extension)
// ⚠️  No streaming, chat-state, or file-transfer support.

const DEBUG = false;
function deepLog(part, ...msg) { DEBUG && console.log(`[DeepBridge/${part}]`, ...msg); }

// ──────────────────────────────────────
// Page-side proxy
// ──────────────────────────────────────
export function createPageDeepProxy(pluginName) {
  const CALL   = `PRAGMATIC_DEEP_CALL_${pluginName.toUpperCase()}`;
  const RESP   = `PRAGMATIC_DEEP_RESPONSE_${pluginName.toUpperCase()}`;
  const TIMEOUT = 300_000;
  const pending = new Map();

  window.addEventListener("message", ev => {
    if (ev.source !== window || ev.data?.type !== RESP) return;
    const { requestId, success, result, error } = ev.data;
    const p = pending.get(requestId);
    if (!p) return;
    clearTimeout(p.t);
    pending.delete(requestId);
    success ? p.ok(result) : p.fail(new Error(`[${pluginName}] ${error}`));
  });

  const makeHandler = (path=[]) => ({
    get(_, key) {
      const k = String(key);
      if (typeof key === "symbol" || ["then","toJSON","prototype","constructor","valueOf","toString","hasOwnProperty"].includes(k))
        return Reflect.get(_, key);
      const newPath = [...path, k];
      const fn = (...args) => new Promise((ok, fail) => {
        const requestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
        const t = setTimeout(() => {
          if (pending.has(requestId)) {
            pending.delete(requestId);
            fail(new Error(`[${pluginName}] Request timed out (${TIMEOUT} ms) for ${newPath.join(".")}`));
          }
        }, TIMEOUT);
        pending.set(requestId, { ok, fail, t });
        window.postMessage({direction:"from-page",type:CALL,pluginName,requestId,methodPath:newPath,args},"*");
      });
      return new Proxy(fn, makeHandler(newPath)); // allow further chaining
    }
  });

  return new Proxy({}, makeHandler());
}

// ──────────────────────────────────────
// Content-script relay
// ──────────────────────────────────────
export function setupContentDeepBridge(pluginName) {
  const CALL = `PRAGMATIC_DEEP_CALL_${pluginName.toUpperCase()}`;
  const RESP = `PRAGMATIC_DEEP_RESPONSE_${pluginName.toUpperCase()}`;

  window.addEventListener("message", ev => {
    if (ev.source !== window || ev.data?.type !== CALL || ev.data.pluginName !== pluginName) return;
    const { requestId, methodPath, args } = ev.data;
    chrome.runtime.sendMessage({type:CALL,pluginName,requestId,methodPath,args}, resp => {
      const payload = {
        direction:"from-content-script",
        type:RESP,
        requestId,
        success: resp?.success ?? false,
        result : resp?.result ?? null,
        error  : chrome.runtime.lastError?.message ?? resp?.error ?? "Extension error"
      };
      window.postMessage(payload, "*");
    });
  });
  deepLog("Content", `bridge ready for ${pluginName}`);
}

// ──────────────────────────────────────
// Service-worker listener
// ──────────────────────────────────────
async function resolvePath(objOrFn, path) {
  if (!Array.isArray(path) || path.length === 0) throw new Error("Empty methodPath");
  let ctx = typeof objOrFn === "function" ? await objOrFn() : objOrFn;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (ctx == null || !(k in ctx)) throw new Error(`Property '${k}' not found while resolving ${path.join(".")}`);
    ctx = ctx[k];
  }
  const finalKey = path[path.length - 1];
  if (ctx == null || !(finalKey in ctx)) throw new Error(`Property '${finalKey}' not found on target object`);
  return { parent: ctx, fn: ctx[finalKey] };
}

export function setupExtensionDeepBridge(pluginName, targetProvider) {
  const CALL = `PRAGMATIC_DEEP_CALL_${pluginName.toUpperCase()}`;
  chrome.runtime.onMessage.addListener((req, _sender, send) => {
    if (req.type !== CALL || req.pluginName !== pluginName) return false;
    (async () => {
      try {
        const { parent, fn } = await resolvePath(targetProvider, req.methodPath);
        if (typeof fn !== "function") throw new Error("Resolved member is not a function");
        const result = await fn.apply(parent, req.args ?? []);
        JSON.stringify(result);                // sanity-check serialisability
        send({ success:true, result });
      } catch (e) {
        send({ success:false, error: e?.message ?? String(e) });
      }
    })();
    return true; // async response
  });
  deepLog("SW", `bridge ready for ${pluginName}`);
} 