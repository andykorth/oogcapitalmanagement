
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
