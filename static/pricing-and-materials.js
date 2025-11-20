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

  // Group rows by material for easy lookup
  const grouped = {};
  for (const row of json) {
    if (!grouped[row.MaterialTicker]) grouped[row.MaterialTicker] = {};
    grouped[row.MaterialTicker][row.ExchangeCode] = row.PriceAverage;
  }

  for (const [ticker, exchanges] of Object.entries(grouped)) {
    const candidates = [
      exchanges.PP7D_UNIVERSE,
      exchanges.PP30D_UNIVERSE,
      exchanges.PP7D_AI1,
      exchanges.AI1
    ];

    const candidateKeys = [
      "PP7D_UNIVERSE",
      "PP30D_UNIVERSE",
      "PP7D_AI1",
      "AI1"
    ];

    let validPrice = null;
    let chosenKey = null;

    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] && candidates[i] > 0) {
        validPrice = candidates[i];
        chosenKey = candidateKeys[i];
        break;
      }
    }

    if (validPrice) {
      freshData[ticker] = validPrice;

      // Add to warning list if it is a less reliable data source
      if (chosenKey === "PP7D_AI1" || chosenKey === "AI1") {
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

function gzipCompressToBase64(str) {
  const binary = pako.gzip(str);
  let b64 = "";
  let bytes = new Uint8Array(binary);

  for (let i = 0; i < bytes.length; i++) {
    b64 += String.fromCharCode(bytes[i]);
  }

  return btoa(b64);
}

function gzipDecompressFromBase64(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decompressed = pako.ungzip(bytes, { to: "string" });
  return decompressed;
}

// ---- full commodity exchange data ----
export let fullCXData = {};

export async function fetchFullCXData(statusEl) {
  const cacheKey = "exchangeData";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const jsonStr = gzipDecompressFromBase64(cached);
    const { timestamp, data } = JSON.parse(jsonStr);
    const age = Date.now() - timestamp;

    // 1 hour cache
    if (age < 3600 * 1000) {
      fullCXData = data;
      return; // cached data is ready
    }
  }

  // Fetch fresh data from endpoint
  const url = "https://rest.fnar.net/exchange/full";

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    statusEl.textContent = "Network error while fetching exchange data.";
    return;
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    statusEl.textContent = "Failed to parse exchange data.";
    return;
  }

  const freshData = json;
  fullCXData = freshData;

  // Attempt to save in localStorage
  const result = safeSetLocalStorageCompressed(
    cacheKey,
    JSON.stringify({
      timestamp: Date.now(),
      data: freshData
    })
  );

  if(statusEl){
    if (!result.ok) {
      statusEl.textContent = result.error;
    } else {
      statusEl.textContent = "Exchange data saved.";
    }
  }
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