import pako from "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs";

// ---- pricing storage ----
export let priceData = {};
export let missingPrices = [];
export let warningPrices = [];

export async function fetchPricing() {
  const cacheKey = "pricingData";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age < 3600 * 1000) { // 1 hour
      priceData = data;
      return;
    }
  }

  // Fetch fresh data from JSON endpoint
  const url = "https://api.prunplanner.org/data/exchanges";
  const res = await fetch(url);
  const json = await res.json();


  const freshData = {};
  missingPrices = [];
  warningPrices = [];

  // Group rows by ticker
  const grouped = {};
  for (const row of json) {
    if (!grouped[row.ticker]) grouped[row.ticker] = [];
    grouped[row.ticker].push(row);
  }

  for (const [ticker, rows] of Object.entries(grouped)) {
    let validPrice = null;
    let usedFallback = false;

    // Prefer vwap_7d across any exchange
    for (const row of rows) {
      if (row.vwap_7d > 0) {
        validPrice = row.vwap_7d;
        break;
      }
    }

    // Fall back to vwap_30d
    if (!validPrice) {
      for (const row of rows) {
        if (row.vwap_30d > 0) {
          validPrice = row.vwap_30d;
          usedFallback = true;
          break;
        }
      }
    }

    if (validPrice) {
      freshData[ticker] = validPrice;
      if (usedFallback) {
        warningPrices.push(ticker);
      }
    } else {
      missingPrices.push(ticker);
    }
  }

  priceData = freshData;

  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: freshData
  }));
}

export let materialData = {};

export async function fetchMaterials() {
  const cacheKey = "materialData";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age < 3600 * 12000) { // 12 hours
      materialData = data;
      return;
    }
  }

  // Fetch fresh data from endpoint
  const url = "https://rest.fnar.net/material/allmaterials";
  const res = await fetch(url);
  const json = await res.json();

  // Convert to lookup by ticker
  const freshData = {};
  for (const mat of json) {
    if (mat.Ticker) {
      freshData[mat.Ticker] = {
        name: mat.Name,
        category: mat.CategoryName,
        weight: mat.Weight,
        volume: mat.Volume
      };
    }
  }

  materialData = freshData;

  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: freshData
  }));
}

export function gzipCompressToBase64(str) {
  const binary = pako.gzip(str);
  let b64 = "";
  let bytes = new Uint8Array(binary);

  for (let i = 0; i < bytes.length; i++) {
    b64 += String.fromCharCode(bytes[i]);
  }

  return btoa(b64);
}

export function gzipDecompressFromBase64(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decompressed = pako.ungzip(bytes, { to: "string" });
  return decompressed;
}

// ---- full commodity exchange data ----// ---- full commodity exchange data ----
export let fullCXData = {};

// fetches full CX data and caches it (existing)
export async function fetchFullCXData(statusEl) {
  const cacheKey = "exchangeData";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const parsed = parseCXEnvelope(cached);
    if (parsed && Date.now() - parsed.timestamp < 3600 * 1000) {
      fullCXData = parsed.data;
      return; // cached data is ready
    }
  }

  // Fetch fresh data from endpoint
  const url = "https://rest.fnar.net/exchange/full";

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    if (statusEl) statusEl.textContent = "Network error while fetching exchange data.";
    return;
  }

  try {
    fullCXData = await res.json();
  } catch (err) {
    if (statusEl) statusEl.textContent = "Failed to parse exchange data.";
    return;
  }

  // Save in localStorage — store a plain JSON envelope so the timestamp is
  // readable by storage-tool; only the data payload is gzip-compressed.
  const compressed = gzipCompressToBase64(JSON.stringify(fullCXData));
  const result = safeSetLocalStorage(
    cacheKey,
    JSON.stringify({ timestamp: Date.now(), data: compressed })
  );

  if (statusEl) {
    if (!result.ok) {
      statusEl.textContent = result.error;
    } else {
      statusEl.textContent = "Exchange data saved.";
    }
  }
}

// Parses the exchangeData envelope, handling both the new format
// ({timestamp, data: compressedBlob}) and the old format (raw compressed blob).
function parseCXEnvelope(cached) {
  try {
    // New format: plain JSON envelope with compressed data field
    const envelope = JSON.parse(cached);
    const data = JSON.parse(gzipDecompressFromBase64(envelope.data));
    return { timestamp: envelope.timestamp, data };
  } catch {
    // Old format: the entire value is the compressed blob
    try {
      const { timestamp, data } = JSON.parse(gzipDecompressFromBase64(cached));
      return { timestamp, data };
    } catch {
      return null;
    }
  }
}

// --- retrieve cached data if it exists, else null ---
export function getCachedCXData() {
  const cached = localStorage.getItem("exchangeData");
  if (!cached) return null;
  const parsed = parseCXEnvelope(cached);
  if (!parsed) { console.warn("Failed to read cached CX data"); return null; }
  fullCXData = parsed.data;
  return parsed.data;
}

// --- get age of cached data as human-readable string ---
export function getCachedCXDataAge() {
  const cached = localStorage.getItem("exchangeData");
  if (!cached) return null;
  const parsed = parseCXEnvelope(cached);
  if (!parsed) return null;

  const ageMs = Date.now() - parsed.timestamp;
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
}



// ---- modeled price ingestion ----
export let modeledPrices = {};

export function parseModeledPrices(text) {
  const lines = text.trim().split(/\r?\n/);
  const data = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip header row (starts with "Material")
    if (i === 0 && line.toLowerCase().startsWith("material")) {
      continue;
    }

    const parts = line.split(/\t/);

    if (parts.length < 2) continue;

    const ticker = parts[0].trim();
    const priceStr = parts[1].trim();
    const price = parseFloat(priceStr);

    if (!ticker || isNaN(price)) continue;

    data[ticker] = price;
  }

  return data;
}

export function saveModeledPrices(text) {
  const parsed = parseModeledPrices(text);
  modeledPrices = parsed;

  localStorage.setItem("modeledPrices", JSON.stringify({
    timestamp: Date.now(),
    data: parsed
  }));

  return Object.keys(parsed).length; // number saved
}

export function loadModeledPrices() {
  const cached = localStorage.getItem("modeledPrices");
  if (!cached) return {};

  const { data } = JSON.parse(cached);
  modeledPrices = data || {};
}


// ---- cache age helper ----
export function getCacheAge(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    if (!timestamp) return null;
    const ageMs = Date.now() - timestamp;
    const minutes = Math.floor(ageMs / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "<1m ago";
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    const quotaExceeded =
      err instanceof DOMException &&
      (
        err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22
      );
    if (quotaExceeded) {
      return {
        ok: false,
        error: `Your browser's local storage is full.

Firefox stores only a few megabytes by default.
To increase storage in Firefox:

1. Open:  **about:config**
2. Search for: **dom.storage.default_quota**
3. Increase it (e.g. from 5120 to 20480 for 20 MB).

Then reload this page and try again.`
      };
    }
    return { ok: false, error: err.toString() };
  }
}

function safeSetLocalStorageCompressed(key, value) {
  try {
    const compressed = gzipCompressToBase64(value);
    localStorage.setItem(key, compressed);
    return { ok: true };
  } catch (err) {
    // Firefox-specific quota check:
    const quotaExceeded =
      err instanceof DOMException &&
      (
        err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22
      );

    if (quotaExceeded) {
      return {
        ok: false,
        error: `Your browser's local storage is full.

Firefox stores only a few megabytes by default.  
To increase storage in Firefox:

1. Open:  **about:config**
2. Search for: **dom.storage.default_quota**
3. Increase it (e.g. from 5120 to 20480 for 20 MB).

Then reload this page and try again.`
      };
    }

    return { ok: false, error: err.toString() };
  }
}