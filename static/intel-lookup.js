function formatRelativeTime(epochMs) {
  if (!epochMs) return "—";
  const now = Date.now();
  let diff = epochMs - now;
  const future = diff > 0;
  diff = Math.abs(diff);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let primary = "", secondary = "";
  if (day > 0)      { primary = `${day}d`;  secondary = `${hr % 24}h`; }
  else if (hr > 0)  { primary = `${hr}h`;   secondary = `${min % 60}m`; }
  else if (min > 0) { primary = `${min}m`;  secondary = `${sec % 60}s`; }
  else              { primary = `${sec}s`; }
  const timeStr = secondary && !secondary.startsWith("0") ? `${primary} ${secondary}` : primary;
  return future ? `in ${timeStr}` : `${timeStr} ago`;
}

async function fetchCompanyData(companyCode) {
  const cacheKey = `company_${companyCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        return { data, fetchedAt: timestamp };
      }
    } catch {}
  }
  const url = `https://rest.fnar.net/company/code/${companyCode}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Company not found");
  const data = await response.json();
  const now = Date.now();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data }));
  return { data, fetchedAt: now };
}

function clearCompanyCache(companyCode) {
  localStorage.removeItem(`company_${companyCode}`);
}

function addRow(tbody, label, value) {
  tbody.insertAdjacentHTML("beforeend", `<tr><th>${label}</th><td>${value}</td></tr>`);
}

function clearTable(tbody) {
  tbody.innerHTML = "";
}

// ── render header card ────────────────────────────────────────────────────

function renderHeaderCard(company, fetchedAt, companyCode) {
  const headerEl = document.getElementById("companyHeader");
  const cacheEl  = document.getElementById("cacheIndicator");

  const founded = company.CreatedEpochMs
    ? (() => {
        const date = new Date(company.CreatedEpochMs).toLocaleDateString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        });
        const days = Math.floor((Date.now() - company.CreatedEpochMs) / (1000 * 60 * 60 * 24));
        return `${date} (${days.toLocaleString()} days ago)`;
      })()
    : "—";

  const badges = [
    company.Tier             ? `<span class="intel-badge badge-tier">${company.Tier}</span>`                     : "",
    company.SubscriptionLevel ? `<span class="intel-badge badge-sub">${company.SubscriptionLevel}</span>`        : "",
    company.OverallRating    ? `<span class="intel-badge badge-rating">Rating ${company.OverallRating}</span>`   : "",
  ].filter(Boolean).join(" ");

  headerEl.innerHTML = `
    <div class="company-card-name">
      ${company.CompanyName ?? "—"}<span class="company-card-code">(${company.CompanyCode ?? "—"})</span>
    </div>
    <div class="company-card-meta">
      ${company.CorporationName ?? "—"} (${company.CorporationCode ?? "—"})
      &nbsp;·&nbsp; ${company.CountryName ?? "—"}
    </div>
    <div class="company-card-meta">
      In-game name: <strong>${company.UserName ?? "—"}</strong>
      &nbsp;·&nbsp; Founded ${founded}
    </div>
    ${badges ? `<div class="company-card-badges">${badges}</div>` : ""}
  `;

  cacheEl.innerHTML = `
    Data fetched ${formatRelativeTime(fetchedAt)}
    <span class="cache-refresh" id="refreshBtn">Refresh</span>
  `;
  document.getElementById("refreshBtn").addEventListener("click", () => {
    clearCompanyCache(companyCode);
    displayCompanyInfo(companyCode);
  });
}

// ── render company overview table ─────────────────────────────────────────

function renderOverviewTable(company) {
  const tbody = document.getElementById("companyTable").querySelector("tbody");
  clearTable(tbody);

  const addIf = (label, value) => {
    if (value == null || value === -1 || value === "") return;
    addRow(tbody, label, value);
  };

  addIf("Activity rating",    company.ActivityRating);
  addIf("Reliability rating", company.ReliabilityRating);
  addIf("Stability rating",   company.StabilityRating);
  addIf("Headquarters",       company.HeadquartersNaturalId);

  if (company.HeadquartersBasePermits > 0) {
    addRow(tbody, "HQ base permits",
      `${company.HeadquartersUsedBasePermits} / ${company.HeadquartersBasePermits}`);
  }
  if (company.AdditionalBasePermits > 0) {
    addRow(tbody, "Extra base permits", company.AdditionalBasePermits);
  }
  if (company.AdditionalProductionQueueSlots > 0) {
    addRow(tbody, "Extra queue slots", company.AdditionalProductionQueueSlots);
  }

  addRow(tbody, "Total offices held", company.Offices?.length ?? 0);
  addRow(tbody, "Total planets inhabited",     company.Planets?.length ?? 0);
}

// ── render offices table ──────────────────────────────────────────────────

function renderOfficesTable(company) {
  const tbody = document.getElementById("officeTable").querySelector("tbody");
  clearTable(tbody);

  if (!Array.isArray(company.Offices) || !company.Offices.length) {
    tbody.insertAdjacentHTML("beforeend", "<tr><td colspan='3'>None</td></tr>");
    return;
  }

  const now = Date.now();
  const officeMap = new Map();

  for (const o of company.Offices) {
    const planet = o.PlanetName || o.PlanetNaturalId || "Unknown";
    const entry = officeMap.get(planet) || { count: 0, active: false, endEpochMs: null };
    entry.count += 1;
    if (o.StartEpochMs && o.EndEpochMs && now >= o.StartEpochMs && now <= o.EndEpochMs) {
      entry.active = true;
      if (!entry.endEpochMs || o.EndEpochMs > entry.endEpochMs) {
        entry.endEpochMs = o.EndEpochMs;
      }
    }
    officeMap.set(planet, entry);
  }

  // Active offices first (soonest expiry first), then former alphabetically
  const entries = Array.from(officeMap.entries()).sort(([aName, aData], [bName, bData]) => {
    if (aData.active && !bData.active) return -1;
    if (!aData.active && bData.active) return 1;
    if (aData.active && bData.active) return (aData.endEpochMs ?? 0) - (bData.endEpochMs ?? 0);
    return aName.localeCompare(bName);
  });

  for (const [planet, data] of entries) {
    const rowClass = data.active ? "office-active" : "";
    const expires  = data.active && data.endEpochMs
      ? formatRelativeTime(data.endEpochMs)
      : "Former";
    tbody.insertAdjacentHTML("beforeend",
      `<tr class="${rowClass}"><td>${planet}</td><td>${data.count}</td><td>${expires}</td></tr>`
    );
  }
}

// ── render planets table ──────────────────────────────────────────────────

function renderPlanetsTable(company) {
  const tbody = document.getElementById("planetTable").querySelector("tbody");
  clearTable(tbody);

  if (!Array.isArray(company.Planets) || !company.Planets.length) {
    tbody.insertAdjacentHTML("beforeend", "<tr><td>None</td></tr>");
    return;
  }
  const sorted = [...company.Planets].sort((a, b) =>
    a.PlanetName.localeCompare(b.PlanetName)
  );
  for (const p of sorted) {
    tbody.insertAdjacentHTML("beforeend", `<tr><td>${p.PlanetName}</td></tr>`);
  }
}

// ── render production iframes ─────────────────────────────────────────────

function loadCompanyReport(graphType, height, company) {
  const reportContainer = document.getElementById("reportContainer");
  if (!company?.UserName) return;
  const userName = encodeURIComponent(company.UserName);
  const iframe = document.createElement("iframe");
  iframe.src = `https://pmmg-products.github.io/reports/?${graphType}&companyName=${userName}&hideOptions`;
  iframe.width = "100%";
  iframe.height = height;
  iframe.style.border = "none";
  iframe.loading = "lazy";
  reportContainer.appendChild(iframe);
}

// ── render exchange orders ────────────────────────────────────────────────

async function loadExchangeOrders(companyCode) {
  const container = document.getElementById("exchangeTable");
  container.innerHTML = `<tr><td style="color:var(--text-secondary);padding:0.5rem">Loading exchange data…</td></tr>`;

  try {
    const response = await fetch(`https://rest.fnar.net/exchange/orders/${companyCode}`);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();

    const exchanges = {};
    for (const order of data) {
      const [material, exchange] = order.Ticker.split(".");
      if (!exchanges[exchange]) {
        exchanges[exchange] = { buyTotal: 0, sellTotal: 0, buyCount: 0, sellCount: 0, rows: [] };
      }
      for (const b of order.Buys) {
        const value = b.Count * b.Cost;
        exchanges[exchange].buyTotal  += value;
        exchanges[exchange].buyCount  += 1;
        exchanges[exchange].rows.push({ material, type: "buy",  count: b.Count, cost: b.Cost, value });
      }
      for (const s of order.Sells) {
        const value = s.Count * s.Cost;
        exchanges[exchange].sellTotal += value;
        exchanges[exchange].sellCount += 1;
        exchanges[exchange].rows.push({ material, type: "sell", count: s.Count, cost: s.Cost, value });
      }
    }

    const exchangeNames = Object.keys(exchanges).sort();

    let html = `<thead><tr><th>Material</th>`;
    for (const ex of exchangeNames) {
      const { buyTotal, sellTotal, buyCount, sellCount } = exchanges[ex];
      html += `
        <th style="text-align:center">
          ${ex}<br>
          <span class="text-buy"  style="font-size:0.75rem;display:block">Σ Buys ${buyTotal.toLocaleString()}</span>
          <span class="text-sell" style="font-size:0.75rem;display:block">Σ Sells ${sellTotal.toLocaleString()}</span>
          <span class="text-buy"  style="font-size:0.75rem;display:block">${buyCount} buy orders</span>
          <span class="text-sell" style="font-size:0.75rem;display:block">${sellCount} sell orders</span>
        </th>`;
    }
    html += `</tr></thead><tbody>`;

    const materials = [...new Set(data.map(o => o.Ticker.split(".")[0]))].sort();
    for (const material of materials) {
      html += `<tr><td style="font-weight:600">${material}</td>`;
      for (const ex of exchangeNames) {
        const rows = exchanges[ex].rows.filter(r => r.material === material);
        if (!rows.length) {
          html += `<td style="color:var(--text-secondary);text-align:center">–</td>`;
        } else {
          const cellContent = rows.map(r => {
            const cls    = r.type === "buy" ? "text-buy" : "text-sell";
            const symbol = r.type === "buy" ? "▲" : "▼";
            return `<div class="${cls}">${symbol} ${r.count.toLocaleString()} @ ${r.cost.toLocaleString()}</div>`;
          }).join("");
          html += `<td>${cellContent}</td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody>`;
    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td style="color:#f87171">Error loading exchange data</td></tr>`;
  }
}

// ── main ──────────────────────────────────────────────────────────────────

async function displayCompanyInfo(companyCode) {
  const statusEl   = document.getElementById("intelStatus");
  const containerEl = document.getElementById("companyInfo");
  const reportContainer = document.getElementById("reportContainer");

  statusEl.textContent = "Loading…";
  containerEl.classList.add("hidden");

  try {
    const { data: company, fetchedAt } = await fetchCompanyData(companyCode);
    if (!company) {
      statusEl.textContent = "Company not found.";
      return;
    }

    statusEl.textContent = "";
    containerEl.classList.remove("hidden");

    renderHeaderCard(company, fetchedAt, companyCode);
    renderOverviewTable(company);

    reportContainer.innerHTML = "";
    loadCompanyReport("type=compTotals&chartType=treemap&metric=volume", 700, company);
    loadCompanyReport("type=compHistory&metric=volume", 250, company);
    loadCompanyReport("type=compHistory&metric=bases",  250, company);

    renderOfficesTable(company);
    renderPlanetsTable(company);
    loadExchangeOrders(company.CompanyCode);

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error: " + err.message;
  }
}

// ── event listeners ───────────────────────────────────────────────────────

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
  const code = new URLSearchParams(window.location.search).get("co");
  if (code) {
    document.getElementById("companyCodeInput").value = code;
    displayCompanyInfo(code);
  }
});
