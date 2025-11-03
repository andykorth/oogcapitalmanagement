async function fetchCompanyData(companyCode) {
  const cacheKey = `company_${companyCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        console.log("Loaded from cache:", companyCode);
        return data;
      }
    } catch {}
  }

  const url = `https://rest.fnar.net/company/code/${companyCode}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Company not found");
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

function formatEpoch(ms) {
  return new Date(ms).toLocaleString();
}

function addRow(tbody, label, value) {
  const row = `<tr><th>${label}</th><td>${value}</td></tr>`;
  tbody.insertAdjacentHTML("beforeend", row);
}

function clearTable(tbody) {
  tbody.innerHTML = "";
}

async function displayCompanyInfo(companyCode) {
  const status = document.getElementById("intelStatus");
  const container = document.getElementById("companyInfo");
  const table = document.getElementById("companyTable").querySelector("tbody");
  const planetTable = document.getElementById("planetTable").querySelector("tbody");
  const officeTable = document.getElementById("officeTable").querySelector("tbody");

  status.textContent = "Loading company data...";
  container.classList.add("hidden");
  clearTable(table);
  clearTable(planetTable);
  clearTable(officeTable);

  try {
    const company = await fetchCompanyData(companyCode);
    if (!company) {
      status.textContent = "Company not found.";
      return;
    }

    status.textContent = "";
    container.classList.remove("hidden");

    // Filter to remove null, -1, false, or empty values
    const filtered = Object.entries(company).filter(([k, v]) => {
      if (v === null || v === -1 || v === false || v === "") return false;
      if (Array.isArray(v)) return false;
      if (typeof v === "object") return false;
      if (k.endsWith("Id")) return false;
      if (k.endsWith("NextRelocationTimeEpochMs")) return false;
      
      return true;
    });
      
    const reportContainer = document.getElementById("reportContainer");
    reportContainer.innerHTML = ""; // Clear any existing iframe

    loadCompanyReport("type=compTotals&chartType=treemap&metric=volume", 700, company);
    loadCompanyReport("type=compHistory&metric=volume", 250, company);
    loadCompanyReport("type=compHistory&metric=bases", 250, company);

    loadExchangeOrders(company.CompanyCode);
    
    // Overview
    for (const [key, val] of filtered) {
      if (key === "CreatedEpochMs") {
        addRow(table, "Created", formatEpoch(val));
      } else {
        addRow(table, key, val);
      }
    }

    addRow(table, "Governor Count", company.Offices.length)
    addRow(table, "Planet (fio) Count", company.Planets.length)
    

    // Planets (sorted alphabetically)
    if (Array.isArray(company.Planets) && company.Planets.length > 0) {
      const sortedPlanets = [...company.Planets].sort((a, b) =>
        a.PlanetName.localeCompare(b.PlanetName)
      );
      for (const p of sortedPlanets) {
        planetTable.insertAdjacentHTML("beforeend", `<tr><td>${p.PlanetName}</td></tr>`);
      }
    } else {
      planetTable.insertAdjacentHTML("beforeend", "<tr><td>None</td></tr>");
    }

    // Offices (aggregated by planet)
    if (Array.isArray(company.Offices) && company.Offices.length > 0) {
      const now = Date.now();
      const officeMap = new Map();

      for (const o of company.Offices) {
        const planet = o.PlanetName || o.PlanetNaturalId || "Unknown";
        const entry = officeMap.get(planet) || { count: 0, current: false };
        entry.count += 1;

        if (o.StartEpochMs && o.EndEpochMs) {
          const start = o.StartEpochMs;
          const end = o.EndEpochMs;
          if (now >= start && now <= end) {
            entry.current = true;
          }
        }

        officeMap.set(planet, entry);
      }

      // Render aggregated rows
      const entries = Array.from(officeMap.entries()).sort(([a], [b]) =>
        a.localeCompare(b)
      );

      for (const [planet, data] of entries) {
        const statusClass = data.current ? "status-current" : "";
        const statusText = data.current ? "Current" : "Previous";
        officeTable.insertAdjacentHTML(
          "beforeend",
          `<tr><td>${planet}</td><td>${data.count}</td><td class="${statusClass}">${statusText}</td></tr>`
        );
      }
    } else {
      officeTable.insertAdjacentHTML("beforeend", "<tr><td colspan='3'>None</td></tr>");
    }
  } catch (err) {
    console.error(err);
    status.textContent = "Error loading company data.";
  }
}

function loadCompanyReport(graphType, height, company) {
  const reportContainer = document.getElementById("reportContainer");

  if (!company?.UserName) {
    console.warn("No UserName found on company object");
    return;
  }

  const userName = encodeURIComponent(company.UserName);

  const iframe = document.createElement("iframe");
  
  iframe.src = `https://pmmg-products.github.io/reports/?${graphType}&companyName=${userName}&hideOptions`;
  iframe.width = "100%";
  iframe.height = height;
  iframe.style.border = "none";
  iframe.loading = "lazy";

  reportContainer.appendChild(iframe);
}
async function loadExchangeOrders(companyCode) {
  const container = document.getElementById("exchangeTable");
  container.innerHTML = `<tr><td class="p-2 text-gray-400">Loading exchange data...</td></tr>`;

  try {
    const response = await fetch(`https://rest.fnar.net/exchange/orders/${companyCode}`);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();

    // Group by exchange
    const exchanges = {};
    for (const order of data) {
      const [material, exchange] = order.Ticker.split(".");
      if (!exchanges[exchange]) {
        exchanges[exchange] = {
          buyTotal: 0,
          sellTotal: 0,
          buyCount: 0,
          sellCount: 0,
          rows: []
        };
      }

      // Process Buys
      for (const b of order.Buys) {
        const value = b.Count * b.Cost;
        exchanges[exchange].buyTotal += value;
        exchanges[exchange].buyCount += 1;
        exchanges[exchange].rows.push({
          material,
          type: "buy",
          count: b.Count,
          cost: b.Cost,
          value,
        });
      }

      // Process Sells
      for (const s of order.Sells) {
        const value = s.Count * s.Cost;
        exchanges[exchange].sellTotal += value;
        exchanges[exchange].sellCount += 1;
        exchanges[exchange].rows.push({
          material,
          type: "sell",
          count: s.Count,
          cost: s.Cost,
          value,
        });
      }
    }

    // Sort exchanges alphabetically
    const exchangeNames = Object.keys(exchanges).sort();

    // Build table header with separate totals + counts
    let html = `<thead><tr><th class="border border-gray-600 p-2">Material</th>`;
    for (const ex of exchangeNames) {
      const { buyTotal, sellTotal, buyCount, sellCount } = exchanges[ex];
      html += `
        <th class="border border-gray-600 p-2 text-center">
          ${ex}<br>
          <span class="text-green-400 text-xs block">Σ Buys ${buyTotal.toLocaleString()}</span>
          <span class="text-red-400 text-xs block">Σ Sells ${sellTotal.toLocaleString()}</span>
          <span class="text-green-400 text-xs block">Buy Orders ${buyCount}</span>
          <span class="text-red-400 text-xs block">Sell Orders ${sellCount}</span>
        </th>`;
    }
    html += `</tr></thead><tbody>`;


    // Collect all material names
    const materials = [...new Set(data.map(o => o.Ticker.split(".")[0]))].sort();

    // Build table rows per material
    for (const material of materials) {
      html += `<tr><td class="border border-gray-600 p-2 font-semibold">${material}</td>`;
      for (const ex of exchangeNames) {
        const rows = exchanges[ex].rows.filter(r => r.material === material);
        if (rows.length === 0) {
          html += `<td class="border border-gray-600 p-2 text-gray-500 text-center">–</td>`;
        } else {
          const cellContent = rows
            .map(r => {
              const color = r.type === "buy" ? "text-green-400" : "text-red-400";
              const symbol = r.type === "buy" ? "▲" : "▼";
              return `<div class="${color}">${symbol} ${r.count.toLocaleString()} @ ${r.cost.toLocaleString()}</div>`;
            })
            .join("");
          html += `<td class="border border-gray-600 p-2">${cellContent}</td>`;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody>`;
    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td class="p-2 text-red-400">Error loading exchange data</td></tr>`;
  }
}

function updateURLParam(key, value) {
  const url = new URL(window.location);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState({}, "", url);
}

document.getElementById("fetchCompanyButton").addEventListener("click", () => {
  const code = document.getElementById("companyCodeInput").value.trim().toUpperCase();
  if (!code) return;
  updateURLParam("co", code);
  displayCompanyInfo(code);
});

window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("co");
  if (code) {
    document.getElementById("companyCodeInput").value = code;
    displayCompanyInfo(code);
  }
});
