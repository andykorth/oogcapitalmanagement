import { fetchPricing, fetchMaterials, priceData, materialData } from "/pricing-and-materials.js";
import { UPKEEP_BUILDINGS } from "/infra-data.js";
import {
  capitalize, efficiencyColor,
  renderProjectedGrowthTable, calculateRequiredNeeds, computeCheapestFulfillment,
} from "/governor-calc.js";
import {
  renderPlanetHeader, renderInfrastructureTable,
  renderWorkforceTable, renderNeedsTable,
} from "/governor-render.js";

const PLANET_STORAGE_KEY   = "gov_helper_selected_planet";
const REFRESH_DURATION     = 1 * 3600 * 1000;
const PLANET_CACHE_DURATION = 24 * 3600 * 1000;

const planetInput            = document.getElementById("planetInput");
const loadInfraBtn           = document.getElementById("loadInfraBtn");
const targetFulfillmentInput = document.getElementById("targetFulfillment");
const warnings               = document.getElementById("warnings");

// Preserved across loads so the fulfillment input can trigger recalculation
let lastRequiredNeeds  = null;
let lastLatestProjects = null;
let lastSelected       = null;
let lastReport         = null;
let lastSiteCount      = 0;

const sectionRetrieved    = document.getElementById("section-retrieved");
const sectionCalculated   = document.getElementById("section-calculated");
const infraTableCont      = document.getElementById("infra-table-container");
const needsTableCont      = document.getElementById("needs-table-container");
const workforceTableCont  = document.getElementById("workforce-table-container");
const supplyPlanCont      = document.getElementById("supply-plan-container");
const projectedNeedsCont  = document.getElementById("projected-needs-container");
const projectedGrowthCont = document.getElementById("projected-growth-container");
const supplyExportSection = document.getElementById("supply-export-section");
const supplyOriginSelect  = document.getElementById("supplyOriginSelect");
const supplyOriginEmoji   = document.getElementById("supplyOriginEmoji");
const supplyJsonOutput    = document.getElementById("supplyJsonOutput");
const supplyCopyBtn       = document.getElementById("supplyCopyBtn");

// ── API fetches ────────────────────────────────────────────────────────────

async function fetchPlanet(planetId) {
  const cacheKey = `planet_${planetId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < PLANET_CACHE_DURATION) return data;
    } catch {}
  }
  const response = await fetch(`https://rest.fnar.net/planet/${planetId}`);
  if (!response.ok) throw new Error("Planet not found");
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

async function fetchInfrastructure(planetId) {
  const cacheKey = `infra_${planetId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < REFRESH_DURATION) {
        console.log("Loaded infrastructure from cache:", planetId);
        return data;
      }
    } catch {}
  }
  const response = await fetch(`https://rest.fnar.net/infrastructure/${planetId}`);
  if (!response.ok) throw new Error("Planet not found");
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

async function fetchSiteCount(planetId) {
  const cacheKey = `sitecount_${planetId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < PLANET_CACHE_DURATION) return data;
    } catch {}
  }
  const response = await fetch(
    `https://api.fnar.net/planet/sitecount?planet=${encodeURIComponent(planetId)}&include_non_player_sites=false`
  );
  if (!response.ok) return null;
  const data = await response.json();
  // API returns an array: [{ PlanetId, PlanetName, PlanetNaturalId, Count }]
  const count = Array.isArray(data) ? data[0]?.Count : null;
  if (count == null) return null;
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: count }));
  return count;
}

// ── Data extraction helpers ────────────────────────────────────────────────

function extractLatestProjects(data) {
  const projects = data.InfrastructureProjects || [];
  if (!projects.length) return { projectMap: new Map(), maxPeriod: null };

  let maxPeriod = -Infinity;
  for (const p of projects) {
    if (p.SimulationPeriod > maxPeriod) maxPeriod = p.SimulationPeriod;
  }

  const latest = projects.filter(p => p.SimulationPeriod === maxPeriod);
  const byTicker = new Map();
  for (const project of latest) {
    byTicker.set(project.Ticker, {
      level: project.Level,
      currentLevel: project.CurrentLevel,
    });
  }

  return { projectMap: byTicker, maxPeriod };
}

function extractLatestReport(data) {
  const reports = data.InfrastructureReports || [];
  if (!reports.length) return null;

  let latest = reports[0];
  for (const report of reports) {
    if (report.SimulationPeriod > latest.SimulationPeriod) {
      latest = report;
    }
  }
  return latest;
}

function getTarget() {
  const val = parseFloat(targetFulfillmentInput.value);
  return (!isNaN(val) && val >= 1 && val <= 100) ? val / 100 : 0.7;
}

// ── Main load ──────────────────────────────────────────────────────────────

async function loadInfrastructure() {
  const planetId = planetInput.value.trim();
  if (!planetId) {
    alert("Please enter a planet identifier.");
    return;
  }

  localStorage.setItem(PLANET_STORAGE_KEY, planetId);
  const url = new URL(window.location.href);
  url.searchParams.set("planet", planetId);
  history.replaceState(null, "", url.toString());

  sectionRetrieved.style.display = "none";
  sectionCalculated.style.display = "none";
  warnings.textContent = "Loading…";

  try {
    // Fetch pricing, planet metadata, and infrastructure data in parallel
    const [infraData, planetData, , , siteCount] = await Promise.all([
      fetchInfrastructure(planetId),
      fetchPlanet(planetId),
      fetchPricing(),
      fetchMaterials(),
      fetchSiteCount(planetId),
    ]);

    if (siteCount == null) {
      warnings.textContent = "Warning: could not retrieve base count for this planet — safety/health base contributions will not be included in calculations.";
    }
    lastSiteCount = siteCount ?? 0;

    const { projectMap: latestProjects, maxPeriod } = extractLatestProjects(infraData);
    const latestReport = extractLatestReport(infraData);
    const startEpochMs = latestReport.TimestampMs;

    warnings.textContent = "";

    // ── Live Data ────────────────────────────────────────────────
    renderPlanetHeader(planetData, maxPeriod, startEpochMs, lastSiteCount);

    infraTableCont.innerHTML = "";
    const infraTable = renderInfrastructureTable(latestProjects);
    infraTableCont.appendChild(
      infraTable ?? Object.assign(document.createElement("p"), { textContent: "No infrastructure found." })
    );

    needsTableCont.innerHTML = "";
    workforceTableCont.innerHTML = "";
    lastReport = latestReport;
    if (latestReport) {
      needsTableCont.appendChild(renderNeedsTable(latestReport));
      workforceTableCont.appendChild(renderWorkforceTable(latestReport));
    }

    sectionRetrieved.style.display = "";

    // ── Calculated Data ──────────────────────────────────────────
    if (latestReport) {
      const population = {
        pioneer:    latestReport.NextPopulationPioneer,
        settler:    latestReport.NextPopulationSettler,
        technician: latestReport.NextPopulationTechnician,
        engineer:   latestReport.NextPopulationEngineer,
        scientist:  latestReport.NextPopulationScientist,
      };
      const requiredNeeds = calculateRequiredNeeds(population);
      lastRequiredNeeds  = requiredNeeds;
      lastLatestProjects = latestProjects;
      renderCheapestFulfillmentTable(requiredNeeds, latestProjects);
      sectionCalculated.style.display = "";
    }

  } catch (err) {
    console.error(err);
    warnings.textContent = "Failed to load: " + err.message;
  }
}

// ── Supply plan orchestration ──────────────────────────────────────────────

function renderCheapestFulfillmentTable(requiredNeeds, latestProjects) {
  supplyPlanCont.innerHTML = "";
  projectedNeedsCont.innerHTML = "";

  const selected = computeCheapestFulfillment(
    requiredNeeds, latestProjects, getTarget(), lastSiteCount, priceData
  );

  if (selected.length === 0) {
    const presentBuildings = UPKEEP_BUILDINGS.filter(b => {
      const p = latestProjects.get(b.ticker);
      return p && p.level > 0;
    });

    const reasons = [];
    if (presentBuildings.length === 0) {
      reasons.push("No infrastructure buildings are present on this planet yet.");
    } else {
      const missingPrices = new Set();
      for (const b of presentBuildings) {
        for (const mat of b.materials) {
          if (!priceData[mat.ticker]) missingPrices.add(mat.ticker);
        }
      }
      if (missingPrices.size > 0) {
        reasons.push(`Market prices are missing for: ${[...missingPrices].sort().join(", ")}. Prices may still be loading — try again in a moment.`);
      }
      if (missingPrices.size === 0) {
        reasons.push("All buildings have prices but no material contributes to the outstanding needs. This is unexpected — please report it.");
      }
    }

    const msg = document.createElement("p");
    msg.style.color = "#f87171";
    msg.textContent = "No supply plan could be calculated. " + reasons.join(" ");
    supplyPlanCont.appendChild(msg);
    return;
  }

  // Compute totals (include base safety/health from player bases)
  const provided = { safety: lastSiteCount * 50, health: lastSiteCount * 50 };
  let totalCost = 0;
  for (const opt of selected) {
    totalCost += opt.cost;
    for (const [need, contrib] of Object.entries(opt.contributions)) {
      provided[need] = (provided[need] || 0) + contrib;
    }
  }

  // --- Supply plan table grouped by building ---
  const byBuilding = new Map();
  for (const opt of selected) {
    if (!byBuilding.has(opt.building)) byBuilding.set(opt.building, []);
    byBuilding.get(opt.building).push(opt);
  }

  const planTable = document.createElement("table");
  planTable.className = "infra-table";
  const planHead = document.createElement("thead");
  planHead.innerHTML = `
    <tr>
      <th>Building</th>
      <th>Material</th>
      <th class="text-right">Qty / Day</th>
      <th class="text-right">Daily Cost</th>
      <th>Needs Supplied</th>
      <th class="text-right">Need Qty</th>
      <th class="text-right">$ / Need</th>
    </tr>
  `;
  planTable.appendChild(planHead);

  // Pre-compute $/need for coloring
  const allSelected = [...byBuilding.values()].flat();
  const dollarPerNeed = opt => {
    const totalNeed = Object.values(opt.contributions).reduce((s, v) => s + v, 0);
    return totalNeed > 0 ? opt.cost / totalNeed : Infinity;
  };
  const dpnValues = allSelected.map(dollarPerNeed).filter(v => isFinite(v));
  const dpnMin   = Math.min(...dpnValues);
  const dpnMax   = Math.max(...dpnValues);
  const dpnRange = dpnMax - dpnMin || 1;

  const planBody = document.createElement("tbody");
  for (const [building, opts] of byBuilding) {
    for (const opt of opts) {
      const needNames = Object.keys(opt.contributions).map(capitalize).join(", ");
      const needQtys  = Object.values(opt.contributions)
        .map(v => v.toLocaleString(undefined, { maximumFractionDigits: 1 }))
        .join(", ");
      const dpn      = dollarPerNeed(opt);
      const norm     = isFinite(dpn) ? (dpn - dpnMin) / dpnRange : 1; // 0 = best, 1 = worst
      const rowColor = efficiencyColor(norm);
      const tr = document.createElement("tr");
      tr.style.backgroundColor = rowColor;
      tr.innerHTML = `
        <td>${opt.activeLevel < opt.builtLevel
          ? `<span style="color:#4ade80;font-weight:600">${opt.activeLevel}</span><span style="color:var(--text-secondary)">/${opt.builtLevel}</span> ${building}`
          : `${opt.activeLevel} ${building}`
        }</td>
        <td>${opt.ticker}</td>
        <td class="text-right">${opt.qtyPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="text-right">${opt.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td>${needNames}</td>
        <td class="text-right">${needQtys}</td>
        <td class="text-right">${isFinite(dpn) ? dpn.toFixed(4) : "—"}</td>
      `;
      planBody.appendChild(tr);
    }
  }
  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
    <td colspan="6" class="font-semibold text-right">Total daily cost</td>
    <td class="text-right font-semibold">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
  `;
  planBody.appendChild(totalRow);
  planTable.appendChild(planBody);
  supplyPlanCont.appendChild(planTable);

  // --- Supply period summary (weight, volume, cost) ---
  const supplyDays = parseFloat(document.getElementById("supplyDays").value) || 30;
  let periodWeight = 0;
  let periodVolume = 0;
  for (const opt of selected) {
    const qty     = opt.qtyPerDay * supplyDays;
    const matInfo = materialData[opt.ticker] || {};
    periodWeight += qty * (matInfo.weight || 0);
    periodVolume += qty * (matInfo.volume || 0);
  }
  const periodCost = totalCost * supplyDays;

  const summaryDiv = document.createElement("div");
  summaryDiv.style.cssText = "margin-top:0.75rem;font-size:0.9rem;color:var(--text-secondary);display:flex;gap:1.5rem;flex-wrap:wrap";
  summaryDiv.innerHTML = `
    <span>Supply period cost: <strong style="color:var(--text-primary)">${periodCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
    <span>Weight: <strong style="color:var(--text-primary)">${periodWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} t</strong></span>
    <span>Volume: <strong style="color:var(--text-primary)">${periodVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³</strong></span>
  `;
  supplyPlanCont.appendChild(summaryDiv);

  // --- Need fulfillment / satisfaction summary ---
  const NEED_ORDER = ["safety", "health", "comfort", "culture", "education"];

  // Compute fulfillments first so we can apply cascading caps
  const fulfillments = {};
  for (const need of NEED_ORDER) {
    const req  = requiredNeeds[need] || 0;
    const prov = provided[need] || 0;
    fulfillments[need] = req > 0 ? prov / req : 1;
  }

  // Apply satisfaction caps (PrUn mechanics):
  //   Safety, Health  → uncapped
  //   Comfort, Culture → capped by min(Safety, Health)
  //   Education        → capped by min(Comfort_sat, Culture_sat)
  const satisfactions = {};
  const wasCapped     = {};
  const lowerBound = Math.min(fulfillments.safety, fulfillments.health);

  satisfactions.safety    = fulfillments.safety;  wasCapped.safety    = false;
  satisfactions.health    = fulfillments.health;  wasCapped.health    = false;
  satisfactions.comfort   = Math.min(fulfillments.comfort,   lowerBound);
  satisfactions.culture   = Math.min(fulfillments.culture,   lowerBound);
  satisfactions.education = Math.min(fulfillments.education, Math.min(satisfactions.comfort, satisfactions.culture));
  wasCapped.comfort   = satisfactions.comfort   < fulfillments.comfort;
  wasCapped.culture   = satisfactions.culture   < fulfillments.culture;
  wasCapped.education = satisfactions.education < fulfillments.education;

  const summaryTable = document.createElement("table");
  summaryTable.className = "infra-table";
  const summaryHead = document.createElement("thead");
  summaryHead.innerHTML = `
    <tr>
      <th>Need</th>
      <th class="text-right">Required for 100%</th>
      <th class="text-right">Provided</th>
      <th class="text-right">Fulfillment</th>
      <th class="text-right">Satisfaction</th>
      <th class="text-right">Achieved Target</th>
    </tr>
  `;
  summaryTable.appendChild(summaryHead);

  const summaryBody = document.createElement("tbody");
  for (const need of NEED_ORDER) {
    const req          = requiredNeeds[need] || 0;
    const prov         = provided[need] || 0;
    const fulfillment  = fulfillments[need];
    const satisfaction = satisfactions[need];
    const capped       = wasCapped[need];
    const met          = satisfaction >= getTarget();

    const satColor = capped ? "#f87171" : "inherit";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${capitalize(need)}</td>
      <td class="text-right">${req.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
      <td class="text-right">${prov.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
      <td class="text-right">${(fulfillment * 100).toFixed(1)}%</td>
      <td class="text-right" style="color:${satColor}">${(satisfaction * 100).toFixed(1)}%</td>
      <td class="text-right" style="color:${met ? "#4ade80" : "#f87171"}">${met ? "✓" : "✗"}</td>
    `;
    summaryBody.appendChild(tr);
  }
  summaryTable.appendChild(summaryBody);
  projectedNeedsCont.appendChild(summaryTable);

  // Store and render export
  lastSelected = selected;
  updateSupplyExport();

  // Rerender projected growth using projected fulfillment from this plan
  if (lastReport && lastLatestProjects) {
    const pf = need => requiredNeeds[need] > 0
      ? Math.min(1, (provided[need] || 0) / requiredNeeds[need])
      : (lastReport[`NeedFulfillment${capitalize(need)}`] ?? 0);
    const projFulfillment = {
      lifeSupport: 1.0, // always assume 100% — life support is not an infra governor need
      safety:      pf('safety'),
      health:      pf('health'),
      comfort:     pf('comfort'),
      culture:     pf('culture'),
      education:   pf('education'),
    };
    projectedGrowthCont.innerHTML = `<div class="projected-meta">Projected happiness with each need at ${getTarget() * 100}%. <br/>Base Happy does not include unemployment, but "Happiness" does.</div>`;
    projectedGrowthCont.appendChild(
      renderProjectedGrowthTable(lastReport, lastLatestProjects, projFulfillment)
    );
  }
}

// ── XIT ACTION export ─────────────────────────────────────────────────────

const CX_MAP = {
  "Antares Station Warehouse": "AI1",
  "Moria Station Warehouse":   "NC1",
  "Arclight Station Warehouse":"CI2",
  "Benten Station Warehouse":  "CI1",
  "Hortus Station Warehouse":  "IC1",
  "Hubur Station Warehouse":   "NC2",
};

function updateSupplyExport() {
  if (!lastSelected || !lastSelected.length) {
    supplyExportSection.style.display = "none";
    return;
  }

  const supplyDays = parseFloat(document.getElementById("supplyDays").value) || 30;
  const origin     = supplyOriginSelect.value;

  // Aggregate qty per ticker across all selected building/material pairs
  const materials = {};
  for (const opt of lastSelected) {
    const qty = Math.ceil(opt.qtyPerDay * supplyDays);
    if (qty > 0) materials[opt.ticker] = (materials[opt.ticker] || 0) + qty;
  }

  const exportJson = {
    actions: [
      {
        group: "Items",
        exchange: CX_MAP[origin] || "NC1",
        priceLimits: {},
        buyPartial: false,
        useCXInv: true,
        name: "BuyItems",
        type: "CX Buy",
      },
      {
        type: "MTRA",
        name: "TransferAction",
        group: "Items",
        origin,
        dest: "Configure on Execution",
      },
    ],
    global: { name: "OOG Governor Supply Plan" },
    groups: [{ type: "Manual", name: "Items", materials }],
  };

  supplyJsonOutput.value = JSON.stringify(exportJson, null, 2);
  supplyOriginEmoji.textContent = origin === "Antares Station Warehouse" ? "😀" : "😢";
  supplyExportSection.style.display = "";
}

// ── Event listeners ────────────────────────────────────────────────────────

supplyCopyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(supplyJsonOutput.value).then(() => {
    supplyCopyBtn.textContent = "Copied!";
    setTimeout(() => (supplyCopyBtn.textContent = "Copy JSON"), 1500);
  });
});

loadInfraBtn.addEventListener("click", loadInfrastructure);

targetFulfillmentInput.addEventListener("input", () => {
  if (lastRequiredNeeds && lastLatestProjects && sectionCalculated.style.display !== "none") {
    renderCheapestFulfillmentTable(lastRequiredNeeds, lastLatestProjects);
  }
});

document.getElementById("supplyDays").addEventListener("input", updateSupplyExport);
supplyOriginSelect.addEventListener("input", updateSupplyExport);

document.addEventListener("DOMContentLoaded", async () => {
  // URL param takes priority; fall back to last-used planet from localStorage
  const urlPlanet  = new URL(window.location.href).searchParams.get("planet");
  const savedPlanet = urlPlanet || localStorage.getItem(PLANET_STORAGE_KEY);

  if (savedPlanet) {
    planetInput.value = savedPlanet;
    if (urlPlanet) {
      await loadInfrastructure();
    }
  }
});
