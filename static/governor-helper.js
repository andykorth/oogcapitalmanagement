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

// Maps the new api.fnar.net infrastructure Type field to our UPKEEP_BUILDINGS tickers
const TYPE_TO_TICKER = {
  SAFETY_STATION:             "SST",
  SECURITY_DRONE_POST:        "SDP",
  EMERGENCY_CENTER:           "EMC",
  INFIRMARY:                  "INF",
  HOSPITAL:                   "HOS",
  WELLNESS_CENTER:            "WCE",
  WILDLIFE_PARK:              "PAR",
  ARCADES:                    "4DA",
  ART_CAFE:                   "ACA",
  ART_GALLERY:                "ART",
  THEATER:                    "VRT",
  PLANETARY_BROADCASTING_HUB: "PBH",
  LIBRARY:                    "LIB",
  UNIVERSITY:                 "UNI",
};

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
let lastUpkeepMap      = new Map(); // building ticker → Map(material ticker → upkeep data)

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
const showAllMatsCheckbox = document.getElementById("showAllMats");

// ── API fetches ────────────────────────────────────────────────────────────

// Fetches infrastructure project data (building levels) from the new api.fnar.net endpoint.
// Returns a flat array of project objects, each with Type, Level, CurrentLevel, PlanetName, etc.
async function fetchInfrastructure(planetId) {
  const cacheKey = `infra3_${planetId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < REFRESH_DURATION) return data;
    } catch {}
  }
  const response = await fetch(
    `https://api.fnar.net/infrastructure?infrastructure=${encodeURIComponent(planetId)}&include_upkeeps=true`
  );
  if (!response.ok) throw new Error("Planet not found");
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

// Fetches population report data (InfrastructureReports) from the old rest.fnar.net endpoint.
// This is the only remaining use of the old infrastructure endpoint.
async function fetchPopulationReports(planetId) {
  const cacheKey = `popreports_${planetId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < REFRESH_DURATION) return data;
    } catch {}
  }

  // todo move to: https://api.fnar.net/planet/Malahat?include_population_reports=true
  const response = await fetch(`https://rest.fnar.net/infrastructure/${planetId}`);
  if (!response.ok) throw new Error("Population reports not found");
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

// Parses the flat-array response from api.fnar.net/infrastructure.
// Returns projectMap (building levels), planetData, and upkeepMap (storage data per material).
function extractLatestProjects(projects) {
  if (!Array.isArray(projects) || !projects.length) {
    return { projectMap: new Map(), planetData: null, upkeepMap: new Map() };
  }

  const byTicker = new Map();
  const upkeepMap = new Map(); // buildingTicker → Map(materialTicker → upkeep info)

  for (const project of projects) {
    const ticker = TYPE_TO_TICKER[project.Type];
    if (!ticker) continue;
    byTicker.set(ticker, {
      level: project.Level,
      currentLevel: project.CurrentLevel,
    });

    if (project.Upkeeps?.length) {
      const matMap = new Map();
      for (const u of project.Upkeeps) {
        matMap.set(u.Ticker, {
          amount:        u.Amount,
          currentAmount: u.CurrentAmount,
          stored:        u.Stored,
          storeCapacity: u.StoreCapacity,
          duration:      u.Duration,
        });
      }
      upkeepMap.set(ticker, matMap);
    }
  }

  // Planet metadata is embedded in every record — use the first one
  const { PlanetName, PlanetNaturalId } = projects[0];
  return { projectMap: byTicker, planetData: { PlanetName, PlanetNaturalId }, upkeepMap };
}

function extractLatestReport(data) {
  const reports = data.InfrastructureReports || [];
  if (!reports.length) return { latestReport: null, maxPeriod: null };

  let latest = reports[0];
  for (const report of reports) {
    if (report.SimulationPeriod > latest.SimulationPeriod) {
      latest = report;
    }
  }
  return { latestReport: latest, maxPeriod: latest.SimulationPeriod };
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
    // Fetch pricing, infrastructure buildings, and population reports in parallel
    const [infraProjects, reportsData, , , siteCount] = await Promise.all([
      fetchInfrastructure(planetId),
      fetchPopulationReports(planetId),
      fetchPricing(),
      fetchMaterials(),
      fetchSiteCount(planetId),
    ]);

    if (siteCount == null) {
      warnings.textContent = "Warning: could not retrieve base count for this planet — safety/health base contributions will not be included in calculations.";
    }
    lastSiteCount = siteCount ?? 0;

    const { projectMap: latestProjects, planetData, upkeepMap } = extractLatestProjects(infraProjects);
    lastUpkeepMap = upkeepMap;
    const { latestReport, maxPeriod } = extractLatestReport(reportsData);
    const startEpochMs = latestReport?.TimestampMs ?? null;

    warnings.textContent = "";

    // ── Live Data ────────────────────────────────────────────────
    renderPlanetHeader(planetData ?? {}, maxPeriod, startEpochMs, lastSiteCount);

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

// ── DPN helpers ────────────────────────────────────────────────────────────

// Builds per-need dpn ($/need-unit) scales from ALL options (including unselected)
// so the color scale reflects the full range of available material options.
function buildNeedDpnScales(options) {
  const needDpns = {}; // need → [dpn values]
  for (const opt of options) {
    for (const [need, contrib] of Object.entries(opt.contributions)) {
      if (contrib <= 0) continue;
      const dpn = opt.cost / contrib;
      if (!isFinite(dpn)) continue;
      if (!needDpns[need]) needDpns[need] = [];
      needDpns[need].push(dpn);
    }
  }
  const scales = {};
  for (const [need, values] of Object.entries(needDpns)) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    scales[need] = { min, max, range: (max - min) || 1 };
  }
  return scales;
}

// Returns a 0–1 normalized dpn for an option, relative to its primary need category.
// 0 = best value (cheapest per need unit in that category), 1 = worst.
function getOptionNorm(opt, needScales) {
  const entries = Object.entries(opt.contributions).filter(([, v]) => v > 0);
  if (!entries.length) return 1;
  // Primary need = highest contribution
  const [primaryNeed, primaryContrib] = entries.sort((a, b) => b[1] - a[1])[0];
  const scale = needScales[primaryNeed];
  if (!scale) return 1;
  const dpn = opt.cost / primaryContrib;
  if (!isFinite(dpn)) return 1;
  return (dpn - scale.min) / scale.range;
}

// ── Supply plan orchestration ──────────────────────────────────────────────

function renderCheapestFulfillmentTable(requiredNeeds, latestProjects) {
  supplyPlanCont.innerHTML = "";
  projectedNeedsCont.innerHTML = "";

  const allOptions = computeCheapestFulfillment(
    requiredNeeds, latestProjects, getTarget(), lastSiteCount, priceData
  );
  const selectedOpts = allOptions.filter(o => o.selected);

  if (selectedOpts.length === 0) {
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
  for (const opt of selectedOpts) {
    totalCost += opt.cost;
    for (const [need, contrib] of Object.entries(opt.contributions)) {
      provided[need] = (provided[need] || 0) + contrib;
    }
  }

  // --- Supply plan table grouped by building ---
  const showAll = showAllMatsCheckbox.checked;
  const displayMats = showAll ? allOptions : selectedOpts;
  const byBuilding = new Map();
  for (const mat of displayMats) {
    if (!byBuilding.has(mat.building)) byBuilding.set(mat.building, []);
    byBuilding.get(mat.building).push(mat);
  }

  const planTable = document.createElement("table");
  planTable.className = "infra-table";
  const planHead = document.createElement("thead");
  planHead.innerHTML = `
    <tr>
      ${showAll ? '<th></th>' : ''}
      <th>Building</th>
      <th>Material</th>
      <th class="text-right">Qty / Day</th>
      <th class="text-right">Daily Cost</th>
      <th>Needs Supplied</th>
      <th class="text-right">Need Qty</th>
      <th class="text-right">$ / Need</th>
      <th>Buffer Storage</th>
    </tr>
  `;
  planTable.appendChild(planHead);

  // Pre-compute $/need for coloring, normalized per need category across ALL options
  const needScales = buildNeedDpnScales(allOptions);
  const dollarPerNeed = opt => {
    const totalNeed = Object.values(opt.contributions).reduce((s, v) => s + v, 0);
    return totalNeed > 0 ? opt.cost / totalNeed : Infinity;
  };

  const planBody = document.createElement("tbody");
  for (const [building, opts] of byBuilding) {
    for (const opt of opts) {
      const needNames = Object.keys(opt.contributions).map(capitalize).join(", ");
      const needQtys  = Object.values(opt.contributions)
        .map(v => v.toLocaleString(undefined, { maximumFractionDigits: 1 }))
        .join(", ");
      const dpn      = dollarPerNeed(opt);
      const norm     = getOptionNorm(opt, needScales); // 0 = best, 1 = worst within its need category
      const rowColor = opt.selected ? efficiencyColor(norm) : "rgba(128,128,128,0.07)";
      const dim      = opt.selected ? "" : "color:var(--text-secondary)";
      const buildingCell = opt.activeLevel < opt.builtLevel
        ? `<span style="color:#4ade80;font-weight:600">${opt.activeLevel}</span><span style="color:var(--text-secondary)">/${opt.builtLevel}</span> ${building}`
        : `${opt.builtLevel} ${building}`;

        debugger;
        
      const upkeep = lastUpkeepMap.get(opt.building)?.get(opt.ticker);
      let storageCell;
      if (upkeep) {
        const total    = upkeep.stored;
        const capacity = upkeep.storeCapacity;
        const pct      = capacity > 0 ? Math.min(100, (total / capacity) * 100) : 0;
        const barColor = (opt.selected) ? (pct > 60 ? '#4ade80' : pct > 30 ? '#fbbf24' : '#f87171') : 'rgba(128,128,128,0.5)';
        storageCell = `
          <td style="line-height: 1; min-width:100px">
            <div style="background:rgba(64,64,64,0.8);border-radius:3px;height:5px;margin-bottom:3px">
              <div style="width:${pct.toFixed(1)}%;background:${barColor};border-radius:3px;height:5px"></div>
            </div>
            <div style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">${total.toLocaleString()} / ${capacity.toLocaleString()}</div>
          </td>`;
      } else {
        storageCell = `<td style="color:var(--text-secondary)">—</td>`;
      }

      const tr = document.createElement("tr");
      tr.style.backgroundColor = rowColor;
      tr.innerHTML = `
        ${showAll ? `<td class="text-center" style="color:${opt.selected ? '#4ade80' : 'var(--text-secondary)'}">${opt.selected ? '✓' : '✗'}</td>` : ''}
        <td style="${dim}">${buildingCell}</td>
        <td style="${dim}">${opt.ticker}</td>
        <td class="text-right" style="${dim}">${opt.qtyPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td class="text-right" style="${dim}">${opt.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
        <td style="${dim}">${needNames}</td>
        <td class="text-right" style="${dim}">${needQtys}</td>
        <td class="text-right" style="${dim}">${isFinite(dpn) ? dpn.toFixed(4) : "—"}</td>
        ${storageCell}
      `;
      planBody.appendChild(tr);
    }
  }
  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
    <td colspan="${showAll ? 8 : 7}" class="font-semibold text-right">Total daily cost</td>
    <td class="text-right font-semibold">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
  `;
  planBody.appendChild(totalRow);
  planTable.appendChild(planBody);
  supplyPlanCont.appendChild(planTable);

  // --- Fill the upkeep to the upkeeps capacity while tracking the cost, weight, and volume.
  let fillCost   = 0;
  let fillWeight = 0;
  let fillVolume = 0;
  for (const opt of selectedOpts) {
    const upkeep = lastUpkeepMap.get(opt.building)?.get(opt.ticker);
    const qty    = upkeep ? Math.max(0, upkeep.storeCapacity - upkeep.stored) : 0;
    if (qty > 0) {
      fillCost   += qty * (priceData[opt.ticker] || 0);
      const matInfo = materialData[opt.ticker] || {};
      fillWeight += qty * (matInfo.weight || 0);
      fillVolume += qty * (matInfo.volume || 0);
    }
  }

  const summaryDiv = document.createElement("div");
  summaryDiv.style.cssText = "margin-top:0.75rem;font-size:0.9rem;color:var(--text-secondary);display:flex;gap:1.5rem;flex-wrap:wrap";
  summaryDiv.innerHTML = `
    <span>Fill cost: <strong style="color:var(--text-primary)">${fillCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
    <span>Weight: <strong style="color:var(--text-primary)">${fillWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} t</strong></span>
    <span>Volume: <strong style="color:var(--text-primary)">${fillVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³</strong></span>
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

  const projectedNeedsTable = document.createElement("table");
  projectedNeedsTable.className = "infra-table";
  const summaryHead = document.createElement("thead");


  summaryHead.innerHTML = `
    <tr>
      <th>Projected Need Fulfillment</th>
      <th class="text-right">Required for 100%</th>
      <th class="text-right">Provided</th>
      <th class="text-right">Fulfillment</th>
      <th class="text-right"><span class="has-tip" data-tip="Satisfaction here is the fulfillment with caps (from previous levels) applied. Red numbers indicate a cap was hit.">Satisfaction</span></th>
    </tr>
  `;
  projectedNeedsTable.appendChild(summaryHead);

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
    `;
    summaryBody.appendChild(tr);
  }
  projectedNeedsTable.appendChild(summaryBody);
  projectedNeedsCont.appendChild(projectedNeedsTable);

  // Store and render export (only selected options go into the supply export)
  lastSelected = selectedOpts;
  updateSupplyExport();

  // Rerender projected growth using projected fulfillment from this plan
  if (lastReport && lastLatestProjects) {
    const pf = need => requiredNeeds[need] > 0
      ? Math.min(1, (provided[need] || 0) / requiredNeeds[need])
      : (lastReport[`NeedFulfillment${capitalize(need)}`] ?? 0);
    const projFulfillment = {
      lifeSupport: 1.0, // always assume 100% — life support cannot be controlled by infrastructure buildings.
      safety:      pf('safety'),
      health:      pf('health'),
      comfort:     pf('comfort'),
      culture:     pf('culture'),
      education:   pf('education'),
    };
    projectedGrowthCont.innerHTML = `<div class="projected-meta">Projected happiness with each need at ${(getTarget() * 100).toFixed(0)}%. <br/>Base Happy does not include unemployment, but "Happiness" does.</div>`;
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

  const origin = supplyOriginSelect.value;

  // Aggregate fill-to-capacity qty per ticker across all selected building/material pairs
  const materials = {};
  for (const opt of lastSelected) {
    const upkeep = lastUpkeepMap.get(opt.building)?.get(opt.ticker);
    const qty    = upkeep ? Math.max(0, upkeep.storeCapacity - upkeep.stored) : 0;
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
        name: "Governor Helper Supply",
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

document.querySelectorAll(".quick-set-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    targetFulfillmentInput.value = btn.dataset.value;
    targetFulfillmentInput.dispatchEvent(new Event("input"));
  });
});

supplyOriginSelect.addEventListener("input", updateSupplyExport);

showAllMatsCheckbox.addEventListener("change", () => {
  if (lastRequiredNeeds && lastLatestProjects && sectionCalculated.style.display !== "none") {
    renderCheapestFulfillmentTable(lastRequiredNeeds, lastLatestProjects);
  }
});

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
